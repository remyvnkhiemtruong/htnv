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

await test('FSA02: health exposes only JWT readiness, never a secret value', () => {
  const source = read('api/health.ts');
  assert(source.includes('authSecretConfigured()'));
  assert(source.includes('jwtSecretConfigured'));
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

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} full-system audit regression tests passed.`);
if (failed.length) process.exit(1);
