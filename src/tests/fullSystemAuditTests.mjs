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

await test('FSA01: JWT signing requires dedicated JWT_SECRET and has no database fallback', () => {
  const source = read('api/auth/auth.js');
  assert(source.includes('authSecretConfigured'), 'Missing JWT readiness helper');
  assert(source.includes('JWT_SECRET_NOT_CONFIGURED'), 'JWT must fail closed when the environment secret is missing');
  assert(source.includes('process.env.JWT_SECRET'), 'JWT signing must use the dedicated environment secret');
  assert(!source.includes("config_key='student_roster_seed_v1'"), 'JWT signing must not read a database fallback seed');
  assert(!source.includes('hoc-tot-ngu-van:jwt-signing:v1'), 'Legacy domain-separated fallback must be removed');
  assert(!source.includes('databaseUrl()'), 'Auth module must reuse the shared database pool');
  assert(source.includes('getPool'), 'Auth module must reuse the shared database pool for user/session reads');
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
  assert(source.includes('học sinh đã nộp bài phân tích'));
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
  for (const token of ['newProfile', 'newClassCode', 'Mã học sinh', 'Tổ / bộ môn', 'Hồ sơ — ']) {
    assert(view.includes(token), `Admin UI missing detailed user token: ${token}`);
  }
});

await test('FSA11: student and teacher sessions no longer eagerly download the legacy academic snapshot', () => {
  const provider = read('src/contexts/PortfolioContext.tsx');
  assert(provider.includes("!['student', 'teacher'].includes(currentUser.role)"), 'Student and teacher sessions must skip the legacy eager snapshot');
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
    "['student-academic', userId, 'overview']",
    "['student-academic', userId, 'workspace', assignmentId]",
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

await test('FSA17: admin management uses paginated server resources instead of academic mega snapshot', () => {
  const view = read('src/views/AdminAuditView.tsx');
  const queries = read('src/app/queries/adminManagementQueries.ts');
  assert(!view.includes("fetch('/api/academic/snapshot'"), 'Admin view must not load the academic mega snapshot');
  for (const token of ['useAdminUsersQuery', 'useAdminClassesQuery', 'useAdminAuditQuery', 'useAdminStatsQuery']) {
    assert(view.includes(token), `Admin view missing query: ${token}`);
  }
  for (const token of ["scope: 'users'", "scope: 'classes'", "scope: 'audit'", "scope: 'stats'"]) {
    assert(queries.includes(token), `Admin query layer missing scope: ${token}`);
  }
});

await test('FSA18: admin API supports server pagination search and class membership detail', () => {
  const source = read('api/admin/users.ts');
  for (const token of [
    'pageSize',
    'LIMIT',
    'OFFSET',
    "scope === \"class-members\"",
    'class_codes',
    'count(DISTINCT cm.user_id)'
  ]) assert(source.includes(token), `Admin resource API missing: ${token}`);
});

await test('FSA19: bulk admin actions protect self-lockout and student academic history', () => {
  const source = read('api/admin/manage.ts');
  for (const token of [
    "action === 'bulk_update_status'",
    'SELF_LOCKOUT_BLOCKED',
    "action === 'bulk_assign_class'",
    "action === 'remove_member'",
    'MEMBERSHIP_HAS_HISTORY',
    'provisionStudentForClass'
  ]) assert(source.includes(token), `Admin bulk safety missing: ${token}`);
});

await test('FSA20: user import previews before write and supports XLSX without a new runtime dependency', () => {
  const api = read('api/admin/manage.ts');
  const parser = read('src/utils/userImportFile.ts');
  const modal = read('src/views/admin/AdminUserImportModal.tsx');
  assert(api.includes("action === 'import_users'"), 'Import action missing');
  assert(api.includes('dryRun'), 'Import must have dry-run preview');
  assert(api.includes('IMPORT_TOO_LARGE'), 'Import row limit missing');
  assert(parser.includes('0x06054b50'), 'XLSX ZIP central directory parser missing');
  assert(parser.includes("new DecompressionStream('deflate-raw')"), 'XLSX decompression missing');
  assert(modal.includes('readUserImportFile'), 'Import modal must parse selected file before preview');
  assert(modal.includes("dryRun: true"), 'Import modal must request backend preview before write');
});

await test('FSA21: drawer focus lifecycle is stable while editing admin forms', () => {
  const source = read('src/components/ui/Drawer.tsx');
  assert(source.includes('const onCloseRef = useRef(onClose)'), 'Drawer must keep latest close callback in a ref');
  assert(source.includes('onCloseRef.current()'), 'Drawer Escape handler must use stable ref');
  assert(source.includes('}, [isOpen]);'), 'Drawer focus lifecycle must only restart when opened/closed');
  assert(!source.includes('}, [isOpen, onClose]);'), 'Inline close callbacks must not reset drawer focus');
});

await test('FSA22: class drawer assignment cannot inherit stale bulk user selection', () => {
  const source = read('src/views/AdminAuditView.tsx');
  assert(source.includes('if (options) setSelectedIds(new Set())'), 'Explicit single/class assignment must clear bulk selection');
  assert(source.includes("if (!['student','teacher'].includes(role)) setNewClassCode('')"), 'Changing a new user to a non-class role must clear class selection');
});

await test('FSA23: React Router owns browser navigation without manual history listeners', () => {
  const app = read('src/App.tsx');
  const routes = read('src/app/router/routes.tsx');
  for (const token of ['BrowserRouter', 'useLocation', 'useNavigate', 'routerNavigate']) {
    assert(app.includes(token), `React Router integration missing: ${token}`);
  }
  assert(routes.includes('routeStateFromLocation'), 'Canonical route parser missing');
  assert(routes.includes('hrefForView'), 'Canonical route href builder missing');
  assert(!app.includes('window.history.pushState'), 'Manual pushState must be removed');
  assert(!app.includes('window.history.replaceState'), 'Manual replaceState must be removed');
  assert(!app.includes("addEventListener('popstate'"), 'Manual popstate listener must be removed');
});

await test('FSA24: student draft recovery uses IndexedDB and explicit offline/conflict states', () => {
  const recovery = read('src/app/offline/draftRecovery.ts');
  const store = read('src/app/store/usePortfolioStore.ts');
  const editor = read('src/views/PortfolioEditorView.tsx');
  for (const token of ["indexedDB.open", "STORE = 'drafts'", 'saveDraftRecovery', 'getDraftRecovery', 'clearDraftRecovery']) {
    assert(recovery.includes(token), `Draft recovery missing: ${token}`);
  }
  assert(store.includes("'offline' | 'conflict'"), 'Autosave state must distinguish offline/conflict');
  assert(store.includes("typed?.code === 'DRAFT_CONFLICT'"), 'Draft conflict must be surfaced explicitly');
  assert(store.includes('persistRecovery(studentId, assignmentId'), 'Unsynced edits must be persisted locally');
  assert(editor.includes("window.addEventListener('online'"), 'Editor must retry when connectivity returns');
  assert(editor.includes("window.addEventListener('offline'"), 'Editor must expose offline state');
  assert(editor.includes('getDraftRecovery'), 'Editor must offer recovery from IndexedDB');
});

await test('FSA25: anchored feedback stores immutable text range context and can reopen it', () => {
  const types = read('src/types/index.ts');
  const api = read('api/_lib/academic-core.js');
  const student = read('api/_lib/student-resources.js');
  const review = read('src/views/TeacherReviewView.tsx');
  const editor = read('src/views/PortfolioEditorView.tsx');
  assert(types.includes('export interface FeedbackAnchor'), 'Feedback anchor type missing');
  for (const token of ['anchor_json', "type: 'text-range'", 'prefix:', 'suffix:']) {
    assert(api.includes(token), `Feedback backend anchor missing: ${token}`);
  }
  assert(student.includes('anchor: row.anchor_json || null'), 'Student resource must expose saved anchor');
  assert(review.includes('selectedAnchor'), 'Teacher review must send selected anchor');
  assert(review.includes('responseTextRef'), 'Text offsets must be relative to immutable review text');
  assert(editor.includes('jumpToFeedbackAnchor'), 'Student editor must reopen anchored feedback');
  assert(editor.includes('setSelectionRange'), 'Student editor must highlight anchored range when possible');
});

await test('FSA26: notification center derives real student and teacher events', () => {
  const header = read('src/components/layout/AppHeader.tsx');
  const center = read('src/components/notifications/NotificationCenter.tsx');
  assert(header.includes('<NotificationCenter'), 'Header must render the notification center');
  assert(!header.includes("message: 'Hiện chưa có thông báo mới.'"), 'Placeholder notification bell must be removed');
  for (const token of [
    "item => !item.resolved",
    "item.evaluatorRole === 'teacher'",
    "review.status === 'completed'",
    "portfolio.status === 'waiting_official_rubric'",
    'markAllRead'
  ]) assert(center.includes(token), `Notification source missing: ${token}`);
});

await test('FSA27: teacher dashboard uses a searchable prioritized review inbox', () => {
  const dashboard = read('src/views/TeacherDashboardView.tsx');
  const inbox = read('src/components/teacher/TeacherReviewInbox.tsx');
  assert(dashboard.includes('<TeacherReviewInbox'), 'Teacher dashboard must use review inbox');
  for (const token of ["'priority'", "'ai'", "'rubric'", "'all'", 'setSearch', 'priority: 1', "onNavigate('teacher-review'"]) {
    assert(inbox.includes(token), `Teacher review inbox behavior missing: ${token}`);
  }
});

await test('FSA28: teacher overview and workspace are scoped resources without a new Vercel function', () => {
  const config = JSON.parse(read('vercel.json'));
  const rewrites = config.rewrites || [];
  const overview = rewrites.find(item => item.source === '/api/teacher/overview');
  const workspace = rewrites.find(item => item.source === '/api/teacher/workspace');
  const literature = rewrites.find(item => item.source === '/api/teacher/literature');
  assert(overview?.destination === '/api/academic/snapshot?scope=teacher-overview');
  assert(workspace?.destination === '/api/academic/snapshot?scope=teacher-workspace');
  assert(literature?.destination === '/api/academic/snapshot?scope=teacher-literature');
  const gateway = read('api/academic/snapshot.ts');
  for (const scope of ['teacher-overview','teacher-workspace','teacher-literature']) {
    assert(gateway.includes(`scope === "${scope}"`), `Missing teacher gateway scope: ${scope}`);
  }
});

await test('FSA29: teacher overview omits version bodies and exact workspace restores them', () => {
  const resource = read('api/_lib/teacher-resources.js');
  assert(resource.includes('mapVersion(row, false)'), 'Teacher overview must omit content_json bodies');
  assert(resource.includes('mapVersion(row, true)'), 'Teacher workspace must include immutable version bodies');
  assert(resource.includes("mine.user_id=$1 AND mine.member_role='teacher'"), 'Teacher resources must be class scoped');
  assert(resource.includes('WHERE a.public_id=$2'), 'Workspace must resolve one assignment');
  assert(resource.includes('p.student_id=$2'), 'Workspace must resolve one student');
});

await test('FSA30: teacher server state uses user-isolated TanStack Query keys', () => {
  const queries = read('src/app/queries/teacherAcademicQueries.ts');
  for (const token of [
    "['teacher-academic', userId, 'overview']",
    "['teacher-academic', userId, 'workspace', assignmentId, studentId]",
    "['teacher-academic', userId, 'literature']",
    "'/api/teacher/overview'",
    "'/api/teacher/literature'",
    'invalidateQueries'
  ]) assert(queries.includes(token), `Missing teacher query behavior: ${token}`);
  const studentQueries = read('src/app/queries/studentAcademicQueries.ts');
  assert(studentQueries.includes("['student-academic', userId, 'overview']"), 'Student overview cache must be user isolated');
  assert(studentQueries.includes("['student-academic', userId, 'workspace', assignmentId]"), 'Student workspace cache must be user isolated');
});

await test('FSA31: teacher detail screens fetch one exact workspace instead of version bodies from overview', () => {
  const review = read('src/views/TeacherReviewView.tsx');
  const diff = read('src/views/VersionDiffView.tsx');
  const analytics = read('src/views/StudentAnalyticsView.tsx');
  const ai = read('src/views/AiWorkspaceView.tsx');
  for (const [name, source] of [['review',review],['diff',diff],['analytics',analytics],['ai',ai]]) {
    assert(source.includes('useTeacherWorkspaceQuery'), `${name} must request exact teacher workspace`);
  }
});

await test('FSA32: assignment builder consumes scoped class overview instead of mega snapshot', () => {
  const builder = read('src/views/AssignmentBuilderView.tsx');
  assert(builder.includes('classes, refreshAcademicData'), 'Assignment builder must consume classes from scoped teacher context');
  assert(!builder.includes("fetch('/api/academic/snapshot'"), 'Assignment builder must not fetch mega snapshot');
});

await test('FSA33: runtime academic imports point only at canonical core/service modules', () => {
  const runtimeFiles = [
    'api/academic/action.ts',
    'api/academic/snapshot.ts',
    'api/academic/catalog.ts',
    'api/health.ts',
    'api/admin/manage.ts'
  ];
  for (const path of runtimeFiles) {
    const source = read(path);
    assert(!source.includes('academic-v2.js'), `${path} still imports v2`);
    assert(!source.includes('academic-v3.js'), `${path} still imports v3`);
    assert(!source.includes('academic-workflow-v4.js'), `${path} still imports workflow-v4`);
  }
  assert(read('api/academic/action.ts').includes('academic-service.js'));
  assert(read('api/academic/snapshot.ts').includes('academic-service.js'));
  assert(read('api/health.ts').includes('academic-core.js'));
});

await test('FSA34: retired academic implementation files are removed', () => {
  for (const path of [
    'api/_lib/academic.js',
    'api/_lib/academic-v2.js',
    'api/_lib/academic-v3.js',
    'api/_lib/academic-workflow-v4.js'
  ]) assert(!fs.existsSync(path), `Retired academic implementation still exists: ${path}`);
});

await test('FSA35: health and smoke expose and verify the exact deployed commit', () => {
  const health = read('api/health.ts');
  const smoke = read('scripts/smoke-production.mjs');
  assert(health.includes('VERCEL_GIT_COMMIT_SHA'), 'Health must expose the Vercel git commit SHA');
  assert(health.includes('VERCEL_GIT_COMMIT_REF'), 'Health must expose the Vercel git ref');
  assert(health.includes("environment: process.env.VERCEL_ENV"), 'Health must expose deployment environment');
  assert(smoke.includes('EXPECTED_GIT_SHA'), 'Production smoke must accept an expected release SHA');
  assert(smoke.includes('production release commit matches expected SHA'), 'Production smoke must fail on stale deployment identity');
  assert(smoke.includes('health endpoint is private no-store'), 'Production smoke must verify private no-store health responses');
  assert(smoke.includes('CSP blocks framing'), 'Production smoke must verify browser security headers');
});

await test('FSA36: production release gate waits for the merged SHA before smoke testing', () => {
  const workflow = read('.github/workflows/production-release.yml');
  const waiter = read('scripts/wait-for-production.mjs');
  assert(workflow.includes('workflow_run:'), 'Release gate must wait for CI completion');
  assert(workflow.includes("github.event.workflow_run.head_branch == 'main'"), 'Release gate must only publish-check main');
  assert(workflow.includes('EXPECTED_GIT_SHA'), 'Release gate must pass the CI commit SHA to smoke');
  assert(waiter.includes('release?.commitSha'), 'Release waiter must inspect deployed release identity');
  assert(waiter.includes('EXPECTED_GIT_SHA'), 'Release waiter must require the expected SHA');
  assert(waiter.includes('Production did not reach expected commit'), 'Release waiter must fail when production stays stale');
});

await test('FSA37: Neon provenance FK has a runner-safe standalone migration', () => {
  const migration = read('scripts/migrations/20261002_feedback_provenance_fk.sql');
  assert(migration.includes('version_feedback_links_feedback_fk'));
  assert(migration.includes('REFERENCES feedbacks(id)'));
  assert(migration.includes('VALIDATE CONSTRAINT version_feedback_links_feedback_fk'));
  assert(!migration.includes('DO ' + '$'), 'Standalone FK migration must avoid procedural blocks');
  assert(!migration.includes('CREATE OR REPLACE FUNCTION'), 'Standalone FK migration must stay runner-safe');
});



await test('FSA38: terminal portfolio states cannot regress when feedback arrives late', () => {
  const core = read('api/_lib/academic-core.js');
  const service = read('api/_lib/academic-service.js');
  assert(core.includes("status NOT IN ('waiting_official_rubric','completed')"), 'Feedback transition must guard rubric-waiting/completed states');
  assert(core.includes('markPortfolioFeedbackReceived(client, row.portfolio_id)'), 'Core AI/teacher feedback must use guarded transition helper');
  assert(core.includes('markPortfolioFeedbackReceived(client, portfolio.id)'), 'Manual feedback must use guarded transition helper');
  assert(service.includes('markPortfolioFeedbackReceived'), 'Workflow service must use guarded transition helper');
  assert(!service.includes("SET status='feedback_received', updated_at=now() WHERE id=$1"), 'Workflow service must not directly regress portfolio status');
});

await test('FSA39: official teacher rubric completes the portfolio atomically', () => {
  const core = read('api/_lib/academic-core.js');
  const service = read('api/_lib/academic-service.js');
  const start = core.indexOf('async function submitRubric');
  const end = core.indexOf('async function assignPeerReview', start);
  const block = core.slice(start, end);
  assert(block.includes('student_reflections'), 'Teacher rubric must verify REF1 inside the rubric transaction');
  assert(block.includes("UPDATE portfolios SET status='completed'"), 'Teacher rubric transaction must set completed');
  assert(block.indexOf("UPDATE portfolios SET status='completed'") < block.indexOf("await client.query('COMMIT')"), 'Completion must happen before rubric transaction commit');
  assert(!service.includes("UPDATE portfolios p\n      SET status='completed'"), 'Service must not complete the portfolio in a second transaction');
});


await test('FSA40: AI queue defaults to V1 and V0/V2 do not wait for nonexistent AI work', () => {
  const core = read('api/_lib/academic-core.js');
  const service = read('api/_lib/academic-service.js');
  const start = core.indexOf('async function createVersion');
  const end = core.indexOf('async function aiCompleteReview', start);
  const block = core.slice(start, end);
  assert(block.includes("['initial']"));
  assert(block.includes('configuredAiStages.includes(stage)'));
  assert(block.includes("'drafting'"));
  assert(block.includes("'teacher_feedback_needed'"));
  assert(block.includes("'feedback_received'"));
  assert(service.includes("result.version.stage !== 'initial' || !result.aiReviewQueued"));
  assert(service.includes('if (revisionCount > 0)'));
});

await test('FSA41: health separates simulation from operational data', () => {
  const core = read('api/_lib/academic-core.js');
  const health = read('api/health.ts');
  for (const token of ['real_versions','simulation_versions','real_ai_reviews','simulation_ai_reviews','active_ai_reviews']) assert(core.includes(token), token);
  for (const token of ['realVersions','simulationVersions','realAiReviews','simulationAiReviews','activeAiReviews']) assert(health.includes(token), token);
});

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} full-system audit regression tests passed.`);
if (failed.length) process.exit(1);
