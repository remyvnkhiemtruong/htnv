import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
let passed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log('✓', name);
  } catch (error) {
    console.error('✗', name);
    throw error;
  }
};

await test('PA01: production rubric fallback never invents a catalog id', () => {
  const source = read('src/contexts/PortfolioContext.tsx');
  assert(source.includes("const emptyRubric: RubricMatrix = { id: '',"));
  assert(!source.includes("const emptyRubric: RubricMatrix = { id: 'rubric-poetics-std'"));
});

await test('PA02: modal keeps viewport safety and traps focus', () => {
  const source = read('src/components/ui/Modal.tsx');
  assert(source.includes('createPortal('));
  assert(source.includes('max-h-[calc(100dvh-1.5rem)]'));
  assert(source.includes("event.key !== 'Tab'"));
  assert(source.includes('previousFocusRef.current?.focus()'));
  assert(source.includes('aria-labelledby'));
});

await test('PA03: dropdown exposes keyboard and ARIA menu semantics', () => {
  const source = read('src/components/ui/Dropdown.tsx');
  assert(source.includes("'aria-expanded': isOpen"));
  assert(source.includes("event.key === 'ArrowDown'"));
  assert(source.includes("event.key === 'ArrowUp'"));
  assert(source.includes("event.key === 'Escape'"));
  assert(source.includes('role="menuitem"'));
});

await test('PA04: production CSP blocks framing/object injection while allowing app fonts', () => {
  const source = read('vercel.json');
  assert(source.includes('Content-Security-Policy'));
  assert(source.includes("object-src 'none'"));
  assert(source.includes("frame-ancestors 'none'"));
  assert(source.includes('fonts.googleapis.com'));
  assert(source.includes('fonts.gstatic.com'));
});

await test('PA05: REF1 follows the exact immutable version selected by the reviewer', () => {
  const source = read('src/views/TeacherReviewView.tsx');
  assert(source.includes('r.versionId === selectedSnapshot.id'));
  assert(source.includes('[reflections, currentPortfolio, assignment, selectedSnapshot]'));
});

await test('PA06: previous/next review navigation operates on the filtered queue', () => {
  const source = read('src/views/TeacherReviewView.tsx');
  assert(source.includes('const visibleQueueIndex = currentPortfolio'));
  assert(source.includes('const nextItem = filteredQueue[visibleQueueIndex + offset]'));
  assert(source.includes('/ {filteredQueue.length}'));
  assert(source.includes('disabled={visibleQueueIndex <= 0}'));
});

await test('PA07: three-tier view hierarchy is role-derived and mutation routes do not inherit', () => {
  const access = read('src/app/auth/accessControl.ts');
  const app = read('src/App.tsx');
  const desktop = read('src/components/layout/AppSidebar.tsx');
  const mobile = read('src/components/layout/MobileDrawer.tsx');
  assert(access.includes('admin: 1'));
  assert(access.includes('teacher: 2'));
  assert(access.includes('ai: 2'));
  assert(access.includes('student: 3'));
  assert(!access.includes("'/student/analytics'"));
  assert(!access.includes("'/student/diff'"));
  assert(!access.includes("'/student/editor'"));
  assert(!access.includes("'/teacher/assignment-builder'"));
  assert(app.includes('canAccessRoute(currentUser.role, routeConfig)'));
  assert(desktop.includes("label: 'Xem dữ liệu'"));
  assert(mobile.includes("label: 'Xem học sinh'"));
});

await test('PA08: assignment builder only keeps and submits a rubric from the hydrated catalog', () => {
  const source = read('src/views/AssignmentBuilderView.tsx');
  assert(source.includes('rubricOptions.some(r => r.id === f.rubricId) ? f.rubricId'));
  assert(source.includes('!rubricOptions.some(option => option.id === form.rubricId)'));
  assert(!source.includes("rubricId: f.rubricId || rubricOptions[0]?.id || rubric.id || ''"));
});

await test('PA09: health statistics use a short in-instance cache without changing the response contract', () => {
  const source = read('api/health.ts');
  assert(source.includes('HEALTH_CACHE_MS = 30_000'));
  assert(source.includes('cachedAcademicHealth()'));
  assert(source.includes('assignments: counts.assignments'));
  assert(source.includes('jwtSecretConfigured'));
});

await test('PA10: V0 question bank survives teacher creation and is rendered to students', () => {
  const builder = read('src/views/AssignmentBuilderView.tsx');
  const action = read('api/academic/action.ts');
  const editor = read('src/views/PortfolioEditorView.tsx');
  assert(builder.includes('questions: predictionEnabled ? predictionQuestions : []'));
  assert(builder.includes('predictionQuestions.length === 0'));
  assert(action.includes('PREDICTION_QUESTIONS_REQUIRED'));
  assert(editor.includes('assignment?.predictionTemplate?.questions'));
  assert(editor.includes('Câu hỏi V0'));
});

await test('PA11: core UI copy avoids obvious AI-generated jargon', () => {
  const files = [
    'src/views/LandingView.tsx',
    'src/views/LoginView.tsx',
    'src/views/v2/StudentDashboardV2.tsx',
    'src/views/AssignmentListView.tsx',
    'src/views/AssignmentBuilderView.tsx',
    'src/views/PortfolioEditorView.tsx',
    'src/views/TeacherDashboardView.tsx',
    'src/views/TeacherReviewView.tsx',
    'src/views/AiWorkspaceView.tsx',
    'src/views/StudentAnalyticsView.tsx',
    'src/views/ClassAnalyticsView.tsx',
    'src/views/LiteratureTextsView.tsx',
    'src/views/RubricManagementView.tsx',
    'src/components/layout/AppHeader.tsx'
  ];
  const source = files.map(read).join('\n');
  for (const phrase of [
    'provenance',
    'Luồng học thuật khép kín',
    'quy chuẩn học thuật khép kín',
    'Focus Mode',
    'response từ ChatGPT',
    'Response từ ChatGPT',
    'Hồ sơ tiến bộ học tập'
  ]) assert(!source.includes(phrase), phrase);
});

await test('PA12: closed assignments are hidden from students and reject writes server-side', () => {
  const academic = read('api/_lib/academic-core.js');
  const workflow = read('api/_lib/academic-service.js');
  const action = read('api/academic/action.ts');
  assert(academic.includes("WHERE p.student_id=$1 AND a.status='published'"));
  assert(academic.match(/assignment_status !== 'published'/g)?.length >= 2);
  assert(workflow.includes("row.assignment_status !== 'published'"));
  assert(action.includes('ASSIGNMENT_CLOSED'));
  assert(action.includes('status = 409'));
});

await test('PA13: V0 hides assigned reading content until prediction is submitted', () => {
  const academic = read('api/_lib/academic-core.js');
  const editor = read('src/views/PortfolioEditorView.tsx');
  assert(academic.includes("v.stage='prediction'"));
  assert(academic.includes("synopsis: locked ? '' : row.synopsis"));
  assert(academic.includes("fullContent: locked ? '' : row.full_content"));
  assert(academic.includes("key !== 'readingGuide' && key !== 'readingSources'"));
  assert(editor.includes('Ngữ liệu sẽ mở sau khi em nộp V0.'));
  assert(editor.includes("literatureText?.fullContent || literatureText?.excerpt"));
  assert(editor.includes('readingGuide && ('));
});

await test('PA14: student cannot open the literature catalog and research catalogs are read-only', () => {
  const routes = read('src/app/router/routes.tsx');
  const palette = read('src/components/layout/CommandPalette.tsx');
  const literature = read('src/views/LiteratureTextsView.tsx');
  const rubric = read('src/views/RubricManagementView.tsx');
  assert(routes.includes("allowedRoles:['teacher','admin','researcher']"));
  assert(!routes.includes("allowedRoles:['teacher','admin','student','researcher']"));
  assert(palette.includes("roles: ['teacher', 'researcher', 'admin']"));
  assert(literature.includes("const canEdit = currentUser.role === 'teacher' || currentUser.role === 'admin'"));
  assert(rubric.includes("const canEdit = currentUser.role === 'teacher' || currentUser.role === 'admin'"));
});

await test('PA15: 403 and 404 pages return users to the correct role home', () => {
  const forbidden = read('src/views/ForbiddenView.tsx');
  const missing = read('src/views/NotFoundView.tsx');
  for (const source of [forbidden, missing]) {
    assert(source.includes("role === 'ai' ? 'ai-workspace'"));
    assert(source.includes("role === 'teacher' ? 'teacher-dashboard'"));
    assert(source.includes("role === 'researcher' ? 'researcher-view'"));
    assert(source.includes("role === 'admin' ? 'admin-view'"));
  }
});

await test('PA16: remaining user-facing copy avoids internal product jargon', () => {
  const files = [
    'src/views/LiteratureTextsView.tsx',
    'src/views/ResearcherJudgeView.tsx',
    'src/views/ForbiddenView.tsx',
    'src/views/NotFoundView.tsx',
    'src/components/layout/AppSidebar.tsx',
    'src/components/layout/MobileDrawer.tsx'
  ];
  const source = files.map(read).join('\n');
  for (const phrase of [
    'AI Workspace',
    'Tạo revision mới',
    'Lưu revision mới',
    'pseudonym server-side',
    'UUID định danh thật',
    'Xem tầng dưới'
  ]) assert(!source.includes(phrase), phrase);
});

await test('PA17: assignment and portfolio lists are role-aware outside the student role', () => {
  const assignments = read('src/views/AssignmentListView.tsx');
  const portfolios = read('src/views/PortfolioListV2.tsx');
  assert(assignments.includes("if (user.role !== 'student')"));
  assert(assignments.includes("onNavigate('teacher-review'"));
  assert(assignments.includes("user.role === 'peer'"));
  assert(portfolios.includes("if (user.role !== 'student')"));
  assert(portfolios.includes("user.role === 'researcher' ? 'Hồ sơ nghiên cứu'"));
  assert(portfolios.includes("studentId: portfolio.studentId"));
});

await test('PA18: peer navigation always returns to the peer portfolio home', () => {
  const header = read('src/components/layout/AppHeader.tsx');
  const palette = read('src/components/layout/CommandPalette.tsx');
  const review = read('src/views/TeacherReviewView.tsx');
  assert(header.includes("role === 'peer' ? 'portfolio-list'"));
  assert(palette.includes("currentUser.role === 'peer' ? 'portfolio-list'"));
  assert(review.includes("currentUser.role === 'peer' ? 'portfolio-list'"));
  assert(review.includes("onClick={() => onNavigate(reviewHome)}"));
});

await test('PA19: admin review is explicitly read-only in the teacher review UI', () => {
  const review = read('src/views/TeacherReviewView.tsx');
  assert(review.includes("const isAdminReadOnly = currentUser.role === 'admin'"));
  assert(review.includes('disabled={isAdminReadOnly}'));
  assert(review.includes('{!isAdminReadOnly && <Button'));
  assert(review.includes("if (isAdminReadOnly) return;"));
});

await test('PA20: remaining visible copy avoids technical implementation wording', () => {
  const files = [
    'src/views/TeacherReviewView.tsx',
    'src/views/AdminAuditView.tsx',
    'src/app/router/routes.tsx',
    'api/academic/action.ts'
  ];
  const source = files.map(read).join('\n');
  for (const phrase of [
    'phiên bản bất biến phù hợp',
    'máy chủ xác nhận',
    'Không gian viết & phân tích',
    'Tiến bộ & Đề xuất',
    'Cần đổi MK'
  ]) assert(!source.includes(phrase), phrase);
});

await test('PA21: shared routes match the roles that their screens support', () => {
  const routes = read('src/app/router/routes.tsx');
  const desktop = read('src/components/layout/AppSidebar.tsx');
  const mobile = read('src/components/layout/MobileDrawer.tsx');
  assert(routes.includes("dashboard: { id:'dashboard', path:'/dashboard', title:'Bàn học', allowedRoles:['student'] }"));
  assert(routes.includes("allowedRoles:['student','teacher','peer','researcher','admin','ai']"));
  assert(routes.includes("'student-dashboard': { id:'student-dashboard', path:'/student/assignments', title:'Nhiệm vụ của tôi', allowedRoles:['student'] }"));
  assert(routes.includes("'version-diff': { id:'version-diff', path:'/student/diff', title:'So sánh phiên bản', allowedRoles:['student','teacher'] }"));
  assert(desktop.includes("if (role === 'ai') return aiSections"));
  assert(mobile.includes("if (role === 'ai') return ["));
});

await test('PA22: AI role gets scoped list navigation instead of dead 403 links', () => {
  const routes = read('src/app/router/routes.tsx');
  const assignments = read('src/views/AssignmentListView.tsx');
  const portfolios = read('src/views/PortfolioListV2.tsx');
  const palette = read('src/components/layout/CommandPalette.tsx');
  assert(routes.includes("'assignment-list'") && routes.includes("'portfolio-list'"));
  assert(assignments.includes("user.role === 'ai' ? 'Nhập phản hồi'"));
  assert(assignments.includes("user.role === 'ai'"));
  assert(portfolios.includes("user.role === 'ai' ? 'Hồ sơ cần phản hồi'"));
  assert(portfolios.includes("canOpenAi"));
  assert(palette.includes("'admin', 'ai']"));
  assert(!palette.includes('Mở không gian viết'));
});

await test('PA23: student progress has a real assignment selector and excludes V0 from essay counts', () => {
  const analytics = read('src/views/StudentAnalyticsView.tsx');
  const desktop = read('src/components/layout/AppSidebar.tsx');
  const palette = read('src/components/layout/CommandPalette.tsx');
  assert(analytics.includes("if (!assignmentId)"));
  assert(analytics.includes('const academicVersions = academicVersionsOf(portfolio)'));
  assert(analytics.includes('{academicVersions.length}'));
  assert(analytics.includes('{academicVersions.map(version => {'));
  assert(desktop.includes("{ id: 'student-analytics', label: 'Tiến độ'"));
  assert(palette.includes("currentUser.role === 'student' ? 'student-analytics' : 'class-analytics'"));
});

await test('PA24: AI workspace is writable only by the dedicated AI role', () => {
  const workspace = read('src/views/AiWorkspaceView.tsx');
  const academic = read('api/_lib/academic-core.js');
  assert(workspace.includes("const canPublish = currentUser.role === 'ai'"));
  assert(workspace.includes('disabled={!canPublish}'));
  assert(workspace.includes('{canPublish ? ('));
  assert(academic.includes("async function aiCompleteReview"));
  assert(academic.includes("if (user.role !== 'ai') throw new Error('FORBIDDEN')"));
});

await test('PA25: admin cannot mutate student assessment state through academic actions', () => {
  const academic = read('api/_lib/academic-core.js');
  const review = read('src/views/TeacherReviewView.tsx');
  assert(academic.includes("if (!['teacher','peer'].includes(user.role)) throw new Error('FORBIDDEN')"));
  assert(academic.includes("if (user.role !== 'student') throw new Error('FORBIDDEN')"));
  assert(academic.includes("if (!['student','teacher','peer'].includes(user.role)) throw new Error('FORBIDDEN')"));
  assert(academic.includes("async function teacherReviewAi(user, input, req) {\n  if (user.role !== 'teacher')"));
  assert(review.includes("const isAdminReadOnly = currentUser.role === 'admin'"));
});

await test('PA26: empty portfolios never surface a fake active submission version', () => {
  const academic = read('api/_lib/academic-core.js');
  const admin = read('api/admin/manage.ts');
  assert(academic.includes("currentActiveVersion: versions.length ? row.active_version : 'Bản nháp'"));
  assert(academic.includes("INSERT INTO portfolios(assignment_id,student_id,active_version)"));
  assert(academic.includes("SELECT $1,cm.user_id,'Bản nháp'"));
  assert(admin.match(/INSERT INTO portfolios\(assignment_id,student_id,active_version\)/g)?.length >= 2);
});

await test('PA27: peer and AI queues use stable anonymous labels instead of identical placeholders', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes("studentName: researcher || peerOrAi ? studentId : row.student_name"));
  assert(academic.includes("student_name: role === 'ai' ? pseudonym('SUB', row.student_id) : row.student_name"));
  assert(!academic.includes("peerOrAi ? 'Bài được phân công'"));
});

await test('PA28: multiple AI accounts cannot complete the same review as if they owned it', () => {
  const academic = read('api/_lib/academic-core.js');
  const workflow = read('api/_lib/academic-service.js');
  assert(academic.includes("(ar.reviewer_id IS NULL OR ar.reviewer_id=$1)"));
  assert(workflow.includes("async function aiClaimReview"));
  assert(workflow.includes("'AI_CLAIM_REVIEW'"));
  assert(workflow.includes("row.reviewer_id && row.reviewer_id !== user.id"));
  assert(workflow.includes("action === 'ai_claim_review'"));
});

await test('PA29: manual AI workspace claims work before copying and reports ownership conflicts', () => {
  const workspace = read('src/views/AiWorkspaceView.tsx');
  const action = read('api/academic/action.ts');
  assert(workspace.includes("action: 'ai_claim_review'"));
  assert(workspace.includes('Nhận xử lý & sao chép bài'));
  assert(action.includes('AI_REVIEW_CLAIMED'));
  assert(action.includes('AI_REVIEW_CLOSED'));
  assert(action.includes('code === "AI_REVIEW_CLAIMED"'));
});

console.log(`Production audit regressions: ${passed}/29 passed`);
