import fs from 'node:fs';

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

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} audit-fix tests passed.`);
if (failed.length) process.exit(1);
