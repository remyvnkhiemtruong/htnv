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

await test('FSA01: JWT signing prefers dedicated JWT_SECRET and keeps a bounded compatibility fallback', () => {
  const source = read('api/auth/auth.js');
  assert(source.includes('authSecretConfigured'), 'Missing JWT readiness helper');
  assert(source.includes('JWT_SECRET_NOT_CONFIGURED'), 'JWT must fail closed if neither secret source is usable');
  assert(source.includes('process.env.JWT_SECRET'), 'JWT signing must prefer the dedicated environment secret');
  assert(source.includes("config_key='student_roster_seed_v1'"), 'Compatibility fallback must use the protected runtime seed');
  assert(source.includes('hoc-tot-ngu-van:jwt-signing:v1'), 'Fallback key must remain domain separated');
  assert(!source.includes('databaseUrl()'), 'Auth module must reuse the shared database pool');
  assert(source.includes('getPool'), 'Auth module must reuse the shared database pool');
  assert(source.includes('decodedHeader?.alg !== "HS256"'), 'JWT header algorithm must be validated');
});

await test('FSA02: health exposes JWT readiness source but never a secret value', () => {
  const source = read('api/health.ts');
  assert(source.includes('authSecretStatus()'));
  assert(source.includes('jwtSecretConfigured'));
  assert(source.includes('jwtSecretSource'));
  assert(source.includes('dedicatedJwtSecret'));
  assert(!source.includes('process.env.JWT_SECRET'));
});

await test('FSA03: assignment creation normalizes required workflow invariants server-side', () => {
  const source = read('api/academic/action.ts');
  for (const token of [
    'normalizeCreateAssignmentInput',
    'aiReviewRequired: true',
    'teacherApprovalRequired: true',
    'reflectionRequired: true',
    'officialRubricRequired: true',
    'rawBytes > 1_000_000'
  ]) assert(source.includes(token), `Missing server assignment guard: ${token}`);
});

await test('FSA04: assignment builder cannot disable required AI, reflection, or official rubric steps', () => {
  const source = read('src/views/AssignmentBuilderView.tsx');
  assert(source.includes('const [predictionEnabled, setPredictionEnabled]'));
  assert(source.includes('aiReviewRequired: true'));
  assert(source.includes('reflectionRequired: true'));
  assert(source.includes('officialRubricRequired: true'));
  assert(!source.includes('setWorkflow('), 'Required workflow steps must not be client-toggleable');
});

await test('FSA05: admin role changes preserve existing student academic history', () => {
  const source = read('api/admin/manage.ts');
  assert(source.includes("before.role === 'student' && role !== 'student'"));
  assert(source.includes('ROLE_CHANGE_HAS_ACADEMIC_HISTORY'));
  assert(source.includes('SELECT 1 FROM portfolios WHERE student_id=$1 LIMIT 1'));
  assert(source.includes("if (role === 'student')"));
  assert(source.includes('INSERT INTO portfolio_drafts'));
});

await test('FSA06: rubric catalog requires six axes and exact four unique levels with bounded numeric values', () => {
  const source = read('api/academic/catalog.ts');
  for (const token of [
    'criteria.length !== AXES.length',
    'levels.length !== 4',
    'new Set(levelNumbers).size !== 4',
    'weight <= 0 || weight > 100',
    'score < 0 || score > 100',
    'CONTENT_TOO_LARGE'
  ]) assert(source.includes(token), `Missing rubric validation: ${token}`);
});

await test('FSA07: Vercel applies baseline browser security headers and keeps API out of SPA rewrite', () => {
  const config = JSON.parse(read('vercel.json'));
  const headers = (config.headers || []).flatMap(item => item.headers || []);
  const names = new Set(headers.map(item => item.key));
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert(names.has(key), `Missing security header: ${key}`);
  }
  const fallback = config.rewrites?.find(item => item.destination === '/index.html');
  assert(fallback?.source?.includes('(?!api'), 'SPA rewrite must exclude API');
  assert(config.regions?.includes('sin1'), 'Production functions must stay in sin1');
});

await test('FSA08: class analytics never counts V0 prediction as submitted academic work', () => {
  const source = read('src/views/ClassAnalyticsView.tsx');
  assert(source.includes("portfolio.versions.some(version => version.stage !== 'prediction')"));
  assert(source.includes('học sinh đã nộp V1+'));
});

await test('FSA09: modal focus trap does not reinitialize on every parent render', () => {
  const source = read('src/components/ui/Modal.tsx');
  assert(source.includes('const onCloseRef = useRef(onClose)'), 'Modal must keep the latest close callback in a ref');
  assert(source.includes('onCloseRef.current()'), 'Escape handling must use the stable close ref');
  assert(source.includes('}, [isOpen]);'), 'Modal focus lifecycle must only restart when open state changes');
  assert(!source.includes('}, [isOpen, onClose]);'), 'Inline onClose callbacks must not reset focus while typing');
});

await test('FSA10: admin user management persists detailed profiles and class assignment', () => {
  const api = read('api/admin/manage.ts');
  const view = read('src/views/AdminAuditView.tsx');
  for (const token of ['profile_json', 'classCode', 'studentCode', 'staffCode', 'department']) {
    assert(api.includes(token), `Admin API missing detailed user token: ${token}`);
  }
  for (const token of ['newProfile', 'newClassCode', 'Hồ sơ người dùng', 'Mã học sinh', 'Tổ / bộ môn / đơn vị']) {
    assert(view.includes(token), `Admin UI missing detailed user token: ${token}`);
  }
});

await test('FSA11: student sessions no longer eagerly download the legacy academic snapshot', () => {
  const provider = read('src/contexts/PortfolioContext.tsx');
  assert(provider.includes("currentUser.role !== 'student'"), 'Student sessions must skip the legacy eager snapshot');
  const editor = read('src/views/PortfolioEditorView.tsx');
  assert(editor.includes('useStudentWorkspaceQuery'), 'Editor must use the scoped workspace query');
  assert(!editor.includes('/api/academic/snapshot'), 'Editor must not call the mega snapshot directly');
  assert(!editor.includes('refreshAcademicData'), 'Editor must not refresh the legacy mega snapshot');
});

await test('FSA12: student resource APIs are scoped to the authenticated student and one assignment when requested', () => {
  const source = read('api/_lib/student-resources.js');
  for (const token of [
    "user?.role !== 'student'",
    'p.student_id=$1',
    "a.status='published'",
    'a.public_id=$2',
    'loadVersions(pool, portfolioIds, false)',
    'loadVersions(pool, [row.portfolio_id], true)'
  ]) assert(source.includes(token), `Missing student resource scope: ${token}`);
  assert(source.includes('p.id portfolio_id, p.student_id'), 'Student identity must be selected explicitly for stable portfolio keys');
});

await test('FSA13: TanStack Query owns student overview/workspace server state', () => {
  const queries = read('src/app/queries/studentAcademicQueries.ts');
  for (const token of [
    "['student-academic', 'overview']",
    "['student-academic', 'workspace', assignmentId]",
    "'/api/student/overview'",
    '/api/student/workspace?assignmentId=',
    "refetchOnMount: 'always'",
    'invalidateQueries'
  ]) assert(queries.includes(token), `Missing student query behavior: ${token}`);
  const dashboard = read('src/views/v2/StudentDashboardV2.tsx');
  const list = read('src/views/AssignmentListView.tsx');
  assert(dashboard.includes('useStudentOverviewQuery'), 'Student dashboard must use overview query');
  assert(list.includes('useStudentOverviewQuery'), 'Student assignment list must use overview query');
});

await test('FSA14: overview payload omits historical version bodies while workspace includes them', () => {
  const source = read('api/_lib/student-resources.js');
  assert(source.includes('loadVersions(pool, portfolioIds, false)'), 'Overview must omit version content');
  assert(source.includes('loadVersions(pool, [row.portfolio_id], true)'), 'Workspace must include version content for diff/editor');
  assert(source.includes("includeContent ? 'v.content_json' : 'NULL::jsonb AS content_json'"), 'Version content selection must be explicit');
});

await test('FSA15: student resource URLs reuse the existing snapshot function on Hobby deployments', () => {
  const config = JSON.parse(read('vercel.json'));
  const rewrites = config.rewrites || [];
  const overview = rewrites.find(item => item.source === '/api/student/overview');
  const workspace = rewrites.find(item => item.source === '/api/student/workspace');
  assert(overview?.destination === '/api/academic/snapshot?scope=student-overview', 'Student overview rewrite is missing');
  assert(workspace?.destination === '/api/academic/snapshot?scope=student-workspace', 'Student workspace rewrite is missing');
  const gateway = read('api/academic/snapshot.ts');
  assert(gateway.includes('scope === "student-overview"'), 'Snapshot gateway must dispatch student overview');
  assert(gateway.includes('scope === "student-workspace"'), 'Snapshot gateway must dispatch student workspace');
});

await test('FSA16: production smoke follows the canonical domain redirect', () => {
  const source = read('scripts/smoke-production.mjs');
  assert(source.includes("redirect: 'follow'"), 'Smoke checks must follow htnv.io.vn -> www.htnv.io.vn');
  assert(source.includes('/api/student/overview'), 'Smoke checks must cover the scoped student resource');
  assert(source.includes('/api/student/workspace?assignmentId=smoke-invalid'), 'Smoke checks must cover the student workspace resource');
});

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} full-system audit regression tests passed.`);
if (failed.length) process.exit(1);
