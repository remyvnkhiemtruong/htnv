import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const read = path => fs.readFileSync(path, 'utf8');
const results = [];
const assert = (condition, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const test = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log(`✓ ${name}`); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message });
    console.error(`✗ ${name} — ${message}`);
  }
};

await test('AF01: portfolio HTML export escapes user-controlled content before document.write', () => {
  const source = read('src/utils/exportUtils.ts');
  assert(source.includes('const escapeHtml ='), 'Missing HTML escaping helper');
  for (const token of [
    'escapeHtml(resp.analysisText)',
    'escapeHtml(q.text)',
    'escapeHtml(portfolio.studentName)',
    'escapeHtml(portfolio.className)',
    'escapeHtml(r.overallFeedback)',
    'escapeHtml(version.changeSummary)'
  ]) assert(source.includes(token), `Missing escaping: ${token}`);
});

await test('AF02: teacher dashboard does not count V0 prediction as a submitted academic version', () => {
  const source = read('src/views/TeacherDashboardView.tsx');
  assert(source.includes("version.stage !== 'prediction'"), 'Teacher dashboard must exclude V0 prediction versions');
  assert(!source.includes("p.versions.length > 0"), 'Teacher dashboard still treats any version, including V0, as a submission');
});

await test('AF03: authenticated login route always recovers to the role home without requiring refresh', () => {
  const source = read('src/App.tsx');
  assert(source.includes("if (sessionChecking || !isAuthenticated || currentView !== 'login' || !currentUser.id) return;"), 'Missing authenticated /login recovery guard');
  assert(source.includes('replaceToView(homeViewForRole(currentUser.role));'), 'Missing role-home recovery redirect');
  assert(source.includes("if (currentView === 'login') return <ViewLoading />;"), 'Authenticated /login must not render the public landing during route hand-off');
  assert(source.includes('const replaceToView = useCallback('), 'Route replacement should be stable across auth effects');
});

await test('AF04: login fields expose correct password-manager semantics', () => {
  const source = read('src/views/LoginView.tsx');
  assert(source.includes('autoComplete="username"'), 'Login email must use username autocomplete');
  assert(source.includes('autoComplete="current-password"'), 'Login password must use current-password autocomplete');
  assert(source.includes('<form onSubmit={submit} className="space-y-5" autoComplete="on">'), 'Login form must allow password managers');
});

await test('AF05: navigation overlays trap focus, close on Escape, and lock background scrolling', () => {
  for (const path of ['src/components/layout/MobileDrawer.tsx', 'src/components/layout/CommandPalette.tsx']) {
    const source = read(path);
    assert(source.includes("event.key === 'Escape'"), `${path} must close on Escape`);
    assert(source.includes("event.key !== 'Tab'") || source.includes("event.key === 'Tab'"), `${path} must trap Tab focus`);
    assert(source.includes("document.body.style.overflow = 'hidden'"), `${path} must lock background scrolling`);
    assert(source.includes('role="dialog"') && source.includes('aria-modal="true"'), `${path} must expose dialog semantics`);
  }
});

await test('AF06: expected academic workflow failures are actionable and do not pollute runtime errors', () => {
  const source = read('api/academic/action.ts');
  assert(source.includes('PREDICTION_REQUIRED_FIRST:'));
  assert(source.includes('RUBRIC_NOT_FOUND:'));
  assert(source.includes('const log = status >= 500 ? console.error : console.warn;'));
});

await test('AF07: every native button declares its form behavior explicitly', () => {
  const files = [];
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.tsx')) files.push(target);
  });
  walk('src');
  const violations = [];
  for (const file of files) {
    const sourceText = read(file);
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if (ts.isJsxOpeningElement(node) && node.tagName.getText(sourceFile) === 'button') {
        const hasType = node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'type');
        if (!hasType) violations.push(`${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  assert(violations.length === 0, `Buttons missing type: ${violations.join(', ')}`);
});

await test('AF08: React failures have a user recovery screen and routes update page context', () => {
  const boundary = read('src/components/errors/AppErrorBoundary.tsx');
  const app = read('src/App.tsx');
  const layout = read('src/components/layout/MainLayout.tsx');
  assert(boundary.includes('getDerivedStateFromError') && boundary.includes('Tải lại trang') && boundary.includes('Về trang chủ'));
  assert(app.includes('<AppErrorBoundary>') && app.includes('document.title = routeTitle'));
  assert(layout.includes("document.getElementById('main-content')?.focus()"), 'Route changes must move focus to the main content');
});

await test('AF09: shared overlays and formerly pointer-only controls support keyboard access', () => {
  const drawer = read('src/components/ui/Drawer.tsx');
  const rubric = read('src/components/rubric/RubricAssessmentGrid.tsx');
  const analytics = read('src/views/ClassAnalyticsView.tsx');
  const snapshot = read('src/components/versioning/SnapshotModal.tsx');
  assert(drawer.includes("event.key === 'Escape'") && drawer.includes('role="dialog"') && drawer.includes('previousFocusRef.current?.focus()'));
  assert(rubric.includes('aria-pressed={isChosen}'), 'Rubric choices must be semantic buttons');
  assert(analytics.includes('aria-sort={selectedAxisFilter === axis'), 'Sortable headers must expose sort state');
  assert(snapshot.includes('setVersionNumber(nextSuggestedVersion)'), 'Snapshot modal must refresh its suggested version when reopened');
});

await test('AF11: draft autosave uses optimistic revision checks to prevent stale overwrites', () => {
  const academic = read('api/_lib/academic-v3.js');
  const store = read('src/app/store/usePortfolioStore.ts');
  const action = read('api/academic/action.ts');
  assert(academic.includes('SELECT draft_revision FROM portfolio_drafts WHERE portfolio_id=$1 FOR UPDATE'));
  assert(academic.includes("throw new Error('DRAFT_CONFLICT')"));
  assert(academic.includes('draft_revision=draft_revision+1'));
  assert(store.includes('draftRevision: latestPortfolio.draftRevision ?? 0'));
  assert(store.includes('applySavedRevision(key, result, set, get)'));
  assert(action.includes('DRAFT_CONFLICT:'));
  assert(action.includes('code === "DRAFT_CONFLICT"'));
});

await test('AF10: production UI avoids template-like AI decoration and promotional filler', () => {
  const productionFiles = [
    'src/views/LandingView.tsx',
    'src/views/LoginView.tsx',
    'src/views/v2/StudentDashboardV2.tsx',
    'src/views/TeacherDashboardView.tsx',
    'src/views/PortfolioEditorView.tsx',
    'src/views/TeacherReviewView.tsx',
    'src/views/AiWorkspaceView.tsx',
    'src/views/StudentAnalyticsView.tsx',
    'src/views/ClassAnalyticsView.tsx'
  ];
  const source = productionFiles.map(read).join('\n');
  const landing = read('src/views/LandingView.tsx');
  const login = read('src/views/LoginView.tsx');
  const visualSystem = read('src/frontend-v3.css');
  assert(landing.split('\n').length < 260, 'Landing page should stay concise and factual');
  for (const token of ['rounded-xl', 'shadow-xs', 'uppercase tracking-wide', 'uppercase tracking-wider', 'animate-hero', 'academic-card-hover']) {
    assert(!source.includes(token), `Template-like decoration returned: ${token}`);
  }
  assert(!login.includes('lg:grid-cols-[1.05fr_0.95fr]'), 'Login must not include a promotional split-screen panel');
  assert(visualSystem.includes('border-radius: 8px') && !visualSystem.includes('transform: translateY(-1px)'), 'Shared panels must remain flat and restrained');
});

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} audit-fix tests passed.`);
if (failed.length) process.exit(1);
