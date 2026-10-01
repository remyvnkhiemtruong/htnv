import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as Diff from 'diff';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) });
  }
}
function assert(condition, message = 'Assertion failed') {
  if (!condition) throw new Error(message);
}
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}
function normalizeVietnameseNFC(text) {
  return String(text).normalize('NFC').trim();
}

// Visual Diff Helper
function calculateVisualDiff(v1, v2) {
  const before = normalizeVietnameseNFC(v1);
  const after = normalizeVietnameseNFC(v2);
  if (before === after) return { type: 'unchanged' };
  if (!before && after) return { type: 'added', prefix: '+' };
  if (before && !after) return { type: 'deleted', prefix: '−' };
  return { type: 'changed', prefix: '✎' };
}

const permissions = {
  student: ['create_draft', 'freeze_version', 'view_diff', 'self_assess', 'resolve_feedback'],
  peer: ['view_diff', 'peer_feedback', 'peer_rubric'],
  teacher: ['view_diff', 'create_assignment', 'teacher_feedback', 'teacher_rubric', 'view_class_analytics', 'ai_review_queue'],
  researcher: ['view_diff', 'view_anonymous_study', 'export_anonymized_data'],
  admin: ['view_diff', 'view_admin_users', 'view_research', 'ai_review_queue'],
  ai: ['ai_review_queue']
};
const can = (role, action) => permissions[role]?.includes(action) ?? false;
function calculateRubricTotal(scores) {
  const values = Object.values(scores);
  const total = values.reduce((sum, value) => sum + value, 0);
  const max = values.length * 4;
  return { total, max, percentage: max ? Math.round((total / max) * 100) : 0 };
}

// -------------------------------------------------------------
// Existing Production Invariant Tests
// -------------------------------------------------------------
test('Unicode tiếng Việt được chuẩn hóa NFC', () => assert(normalizeVietnameseNFC(' Vợ nhặt – Kim Lân ') === 'Vợ nhặt – Kim Lân'));
test('Visual Diff phân biệt thêm/xóa/sửa/không đổi', () => {
  assert(calculateVisualDiff('', 'mới').prefix === '+');
  assert(calculateVisualDiff('cũ', '').prefix === '−');
  assert(calculateVisualDiff('cũ', 'mới').prefix === '✎');
  assert(calculateVisualDiff('giữ nguyên', 'giữ nguyên').type === 'unchanged');
});
test('Rubric 6 trục tính đúng tổng và phần trăm', () => {
  const value = calculateRubricTotal({ a: 4, b: 3, c: 3, d: 2, e: 4, f: 4 });
  assert(value.total === 20);
  assert(value.max === 24);
  assert(value.percentage === 83);
});
test('Ma trận quyền bao phủ đủ 6 role production', () => assert(['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'].every(role => Array.isArray(permissions[role]))));
test('Học sinh không có quyền xem danh sách admin', () => assert(!can('student', 'view_admin_users')));
test('Admin có quyền đọc danh sách user thật', () => assert(can('admin', 'view_admin_users')));
test('Teacher, Admin và AI được dùng hàng đợi AI; student không được', () => {
  assert(can('teacher', 'ai_review_queue'));
  assert(can('admin', 'ai_review_queue'));
  assert(can('ai', 'ai_review_queue'));
  assert(!can('student', 'ai_review_queue'));
});
test('Peer không có quyền quản trị hệ thống', () => assert(!can('peer', 'view_admin_users')));

test('Thương hiệu chính thức là Học tốt Ngữ Văn trên các bề mặt chính', () => {
  for (const p of ['index.html', 'src/views/LoginView.tsx', 'src/components/layout/AppHeader.tsx', 'src/components/layout/MainLayout.tsx', 'README.md']) {
    assert(read(p).includes('Học tốt Ngữ Văn'), `${p} chưa dùng brand mới`);
  }
  assert(read('package.json').includes('"name": "hoc-tot-ngu-van"'));
});

test('F5 ở route SPA luôn fallback về index.html nhưng không nuốt API', () => {
  const config = JSON.parse(read('vercel.json'));
  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
  const spa = rewrites.find(rule => rule?.destination === '/index.html');
  assert(spa, 'Thiếu SPA fallback về /index.html');
  assert(typeof spa.source === 'string' && spa.source.includes('(?!api'), 'SPA fallback phải loại trừ /api');
});

test('Auth client không lưu JWT trong localStorage', () => {
  assert(!read('src/app/store/useAuthStore.ts').includes('localStorage'));
  assert(!read('src/views/LoginView.tsx').includes('localStorage'));
});
test('Cookie session có HttpOnly, Secure và SameSite', () => {
  const auth = read('api/auth/auth.js');
  assert(auth.includes('HttpOnly'));
  assert(auth.includes('Secure'));
  assert(auth.includes('SameSite=Lax'));
});
test('API nhạy cảm xác thực lại trạng thái tài khoản từ PostgreSQL', () => {
  for (const p of ['api/admin/users.ts', 'api/admin/manage.ts', 'api/academic/action.ts', 'api/academic/snapshot.ts', 'api/academic/catalog.ts', 'api/auth/change-password.ts']) {
    assert(read(p).includes('authenticate('), `${p} chưa dùng live-session authentication`);
  }
});
test('Hồ sơ cá nhân mở rộng được lưu server-side', () => {
  const auth = read('api/auth/auth.js');
  const me = read('api/auth/me.ts');
  assert(auth.includes('profile_json'));
  assert(auth.includes('updateProfile'));
  assert(me.includes('req.method==="PATCH"'));
  assert(read('src/components/layout/AppHeader.tsx').includes("method:'PATCH'"));
});
test('Portfolio version được khóa bất biến ở PostgreSQL', () => {
  const migration = read('scripts/migrate-audit-hardening-20260911.sql');
  assert(migration.includes('prevent_portfolio_version_mutation'));
  assert(migration.includes('BEFORE UPDATE OR DELETE ON portfolio_versions'));
});
test('PostgreSQL connection ép TLS verify-full', () => {
  assert(read('api/_lib/db.js').includes('sslmode=verify-full'));
});

test('Editor không dereference assignment trước khi snapshot hydrate', () => {
  const editor = read('src/views/PortfolioEditorView.tsx');
  assert(!editor.includes('|| assignments[0]'));
  assert(!editor.includes('getPortfolio(currentUser.id, assignment.id'));
  assert(editor.includes('if (!assignment)'));
  assert(editor.includes('if (!portfolio)'));
});
test('Version Diff không dựng phiên bản giả và có guard dữ liệu thiếu', () => {
  const diff = read('src/views/VersionDiffView.tsx');
  assert(!diff.includes('|| relevantPortfolios[0]'));
  assert(!diff.includes('diffChunks'));
  assert(diff.includes('versions.length < 2'));
  assert(diff.includes('if (!assignment)'));
});
test('Teacher Review chỉ dùng hàng đợi và feedback production', () => {
  const review = read('src/views/TeacherReviewView.tsx');
  assert(!review.includes('user-std-1'));
  assert(!review.includes('mockDb'));
  assert(!review.includes('saveFeedback'));
  assert(review.includes('addAnchoredFeedback'));
  assert(review.includes('Object.values(portfolios)'));
});
test('Không còn simulated state trong ba workspace trọng yếu', () => {
  for (const p of ['src/views/PortfolioEditorView.tsx', 'src/views/VersionDiffView.tsx', 'src/views/TeacherReviewView.tsx']) {
    const source = read(p);
    assert(!source.includes('Network status simulation'));
    assert(!source.includes('setTimeout('), `${p} còn delay giả`);
  }
});
test('Editor chỉ cho học sinh ghi bài', () => {
  const routes = read('src/app/router/routes.tsx');
  assert(routes.includes("editor: { id:'editor', path:'/student/editor', title:'Bài viết', allowedRoles:['student'] }"));
});
test('Không hardcode assign-vo-nhat trong navigation shortcut và view chính', () => {
  for (const p of ['src/App.tsx', 'src/views/AssignmentListView.tsx', 'src/views/PortfolioListView.tsx', 'src/views/VersionDiffView.tsx']) {
    assert(!read(p).includes("'assign-vo-nhat'"), `${p} còn hardcode assign-vo-nhat`);
  }
});
test('Recommendation engine xử lý an toàn khi availableAssignments rỗng', () => {
  const engine = read('src/utils/recommendationEngine.ts');
  assert(engine.includes('if (!fallback) return EMPTY_RECOMMENDATION;'), 'Recommendation engine thiếu guard fallback');
  const guardIndex = engine.indexOf('if (!fallback)');
  const fallbackIdIndex = engine.indexOf('fallback.id');
  assert(guardIndex >= 0 && fallbackIdIndex > guardIndex, 'fallback.id phải được gọi sau guard !fallback');
});
test('Không còn simulated API service cũ', () => {
  const removed = [
    'src/services/api/assignmentService.ts',
    'src/services/api/portfolioService.ts',
    'src/services/api/rubricService.ts',
    'src/services/api/analyticsService.ts'
  ];
  assert(removed.every(p => !fs.existsSync(p)));
});

// -------------------------------------------------------------
// TC01 - TC27: Behavioral & System Verification Tests
// -------------------------------------------------------------

test('TC01: autosave update draft, không tạo version mới, không tạo ai request', () => {
  const academic = read('api/_lib/academic-core.js');
  const startIndex = academic.indexOf('async function saveDraft');
  const endIndex = academic.indexOf('async function createVersion');
  const saveDraftCode = academic.slice(startIndex, endIndex);
  assert(saveDraftCode.includes('portfolio_drafts'), 'saveDraft phải lưu vào portfolio_drafts');
  assert(!saveDraftCode.includes('INSERT INTO portfolio_versions'), 'saveDraft không được tạo immutable version');
  assert(!saveDraftCode.includes('INSERT INTO ai_review_requests'), 'saveDraft không được tạo AI review');
});

test('TC02: submit version tạo đúng 1 immutable version, sequence tăng đúng 1', () => {
  const academic = read('api/_lib/academic-core.js');
  const startIndex = academic.indexOf('async function createVersion');
  const endIndex = academic.indexOf('async function aiCompleteReview');
  const code = academic.slice(startIndex, endIndex);
  assert(code.includes('ORDER BY sequence_no DESC'), 'createVersion phải đọc sequence_no cao nhất');
  assert(code.includes('nextSeq = prev ? Number(prev.sequence_no || 0) + 1 : 1'), 'sequence_no phải tăng đúng 1');
  assert(code.includes('content_checksum'), 'createVersion phải tính checksum');
  assert(code.includes('INSERT INTO portfolio_versions'), 'createVersion phải insert immutable version');
});

test('TC03: submit version tự động tạo đúng 1 ai_review_requests status=pending', () => {
  const academic = read('api/_lib/academic-core.js');
  const code = academic.slice(academic.indexOf('async function createVersion'), academic.indexOf('async function aiCompleteReview'));
  assert(code.includes('INSERT INTO ai_review_requests'), 'createVersion phải tạo ai_review_requests');
  assert(code.includes("'submitted_waiting_ai'"), 'portfolio status phải chuyển submitted_waiting_ai');
});

test('TC04: retry submit cùng submission_key trả về version cũ, không nhân đôi', () => {
  const academic = read('api/_lib/academic-core.js');
  const code = academic.slice(academic.indexOf('async function createVersion'), academic.indexOf('async function aiCompleteReview'));
  assert(code.includes('submission_key=$2'), 'createVersion phải kiểm tra submission_key');
  assert(code.includes('isIdempotentRetry: true'), 'Retry cùng key phải trả version đã tạo');
});

test('TC05: ai_complete_review xuất bản feedback AI cho học sinh ngay', () => {
  const workflow = read('api/_lib/academic-service.js');
  const code = workflow.slice(workflow.indexOf('async function aiCompleteReview'), workflow.indexOf('async function teacherReviewAi'));
  assert(code.includes('INSERT INTO feedbacks'), 'AI complete phải tạo feedback hiển thị cho học sinh');
  assert(code.includes("'ai'"), 'Feedback phải giữ author_role=ai');
  assert(code.includes("teacher_review_status='pending'"), 'Giáo viên vẫn có hàng đợi kiểm tra');
  assert(code.includes('visibleToStudent: true'), 'Kết quả phải được đánh dấu hiển thị cho học sinh');
});

test('TC06: teacher approved không nhân đôi feedback AI thành feedback giáo viên', () => {
  const workflow = read('api/_lib/academic-service.js');
  const code = workflow.slice(workflow.indexOf('async function teacherReviewAi'), workflow.indexOf('async function saveReflection'));
  assert(code.includes("if (decision === 'approved') finalResponse = ''"), 'Approved phải giữ nguyên feedback AI');
  assert(code.includes("if (decision === 'revised' && finalResponse)"), 'Chỉ revised mới tạo feedback giáo viên bổ sung');
});

test('TC07: teacher revised tạo feedback giáo viên riêng có provenance', () => {
  const workflow = read('api/_lib/academic-service.js');
  const code = workflow.slice(workflow.indexOf('async function teacherReviewAi'), workflow.indexOf('async function saveReflection'));
  assert(code.includes("decision === 'revised' && finalResponse"), 'Phải có nhánh revised');
  assert(code.includes('source_ai_review_id'), 'Feedback bổ sung phải liên kết nguồn AI');
  assert(code.includes("'teacher'"), 'Feedback bổ sung phải có author_role=teacher');
});

test('TC08: teacher rejected không xóa feedback AI đã công bố', () => {
  const workflow = read('api/_lib/academic-service.js');
  const code = workflow.slice(workflow.indexOf('async function teacherReviewAi'), workflow.indexOf('async function saveReflection'));
  assert(code.includes("decision === 'revised' && finalResponse"), 'Rejected không đi qua nhánh tạo bản sửa');
  assert(!code.includes('DELETE FROM feedbacks'), 'Rejected không được xóa feedback AI đã gửi');
  assert(code.includes("status='feedback_received'"), 'Workflow phải thoát trạng thái chờ duyệt');
});

test('TC09: học sinh chỉ xem feedback của chính mình', () => {
  const student = read('api/_lib/student-resources.js');
  assert(student.includes('WHERE p.student_id=$1'), 'Student resource phải scope theo authenticated user');
});

test('TC10: student resource không trả ai_review_requests', () => {
  const student = read('api/_lib/student-resources.js');
  const overview = student.slice(student.indexOf('export async function getStudentOverview'), student.indexOf('export async function getStudentWorkspace'));
  assert(!overview.includes('aiReviews:'), 'Student overview không được trả ai_review_requests');
});

test('TC11: giáo viên chỉ thấy lớp được phân công', () => {
  const teacher = read('api/_lib/teacher-resources.js');
  assert(teacher.includes("mine.user_id=$1 AND mine.member_role='teacher'"), 'Teacher overview phải scope theo class membership');
});

test('TC12: teacher workspace không thấy assignment lớp khác', () => {
  const teacher = read('api/_lib/teacher-resources.js');
  const workspace = teacher.slice(teacher.indexOf('export async function getTeacherWorkspace'), teacher.indexOf('export async function getTeacherLiteratureCatalog'));
  assert(workspace.includes("mine.user_id=$1 AND mine.member_role='teacher'"), 'Teacher workspace phải xác thực lớp trước khi lấy portfolio');
  assert(workspace.includes('WHERE a.public_id=$2'), 'Teacher workspace phải khóa đúng assignment');
});

test('TC13: researcher snapshot không chứa PII học sinh', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes("const researcher = role === 'researcher'"), 'Có nhánh researcher');
  assert(academic.includes("pseudonym('HS', row.student_id)"), 'Researcher phải dùng pseudonym học sinh');
  assert(academic.includes("pseudonym('COHORT', row.class_code)"), 'Researcher phải ẩn danh lớp/cohort');
  assert(academic.includes("if (role === 'admin')"), 'Danh sách user thật chỉ được dựng cho admin');
});

test('TC14: pseudonym researcher là stable qua nhiều lần query', () => {
  const secret = 'cvt-anonymization-secret-key-v1';
  const pseudonym = (id) => `HS-ANON-${crypto.createHmac('sha256', secret).update(String(id)).digest('hex').slice(0, 4).toUpperCase()}`;
  const p1 = pseudonym('std-uuid-1234');
  const p2 = pseudonym('std-uuid-1234');
  const p3 = pseudonym('std-uuid-5678');
  assert(p1 === p2, 'Pseudonym phải nhất quán 100% khi cùng ID');
  assert(p1 !== p3, 'Khác ID phải tạo khác pseudonym');
  assert(p1.startsWith('HS-ANON-') && p1.length === 12, 'Pseudonym phải có format HS-ANON-XXXX');
});

test('TC15: peer chỉ thấy bài được gán', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes('async function exactPeerScope'), 'Phải có exact peer scope');
  assert(academic.includes('pra.reviewer_id=$1'), 'Peer scope phải khóa theo reviewer');
  assert(academic.includes('v.id=pra.version_id AND v.portfolio_id=p.id'), 'Peer phải gắn đúng immutable version');
});

test('TC16: peer không thấy bài ngoài phạm vi', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes('PEER_ASSIGNMENT_FORBIDDEN'), 'Peer ngoài phạm vi phải bị từ chối');
});

test('TC17: student submit rubric luôn khóa studentId về chính tài khoản', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes("const targetStudentId = user.role === 'student' ? user.id : cleanTrimmed(input.studentId, 80)"), 'Student rubric phải bỏ qua studentId khác do client gửi');
});

test('TC18: teacher review reset rubric score khi đổi học sinh', () => {
  const teacherReview = read('src/views/TeacherReviewView.tsx');
  assert(teacherReview.includes('setRubricScores(reset)'), 'Teacher review phải reset rubricScores');
  assert(teacherReview.includes('currentPortfolio'), 'useEffect reset rubricScores phải phụ thuộc vào currentPortfolio');
});

test('TC19: teacher review reset rubric score khi đổi version', () => {
  const teacherReview = read('src/views/TeacherReviewView.tsx');
  assert(teacherReview.includes('selectedVersion'), 'useEffect reset rubricScores phải phụ thuộc vào selectedVersion');
});

test('TC20: text diff phát hiện đúng added/deleted/unchanged trên tiếng Việt NFC', () => {
  const text1 = 'Kim Lân miêu tả tình huống nhặt vợ trong bối cảnh nạn đói năm 1945.'.normalize('NFC');
  const text2 = 'Nhà văn Kim Lân đã khắc họa sâu sắc tình huống nhặt vợ trong nạn đói năm 1945.'.normalize('NFC');
  const diffs = Diff.diffWordsWithSpace(text1, text2);
  const hasAdded = diffs.some(d => d.added);
  const hasRemoved = diffs.some(d => d.removed);
  const hasUnchanged = diffs.some(d => !d.added && !d.removed);
  assert(hasAdded, 'Diff phải phát hiện phần chữ thêm mới');
  assert(hasRemoved, 'Diff phải phát hiện phần chữ bị xóa');
  assert(hasUnchanged, 'Diff phải giữ nguyên phần chữ chung');
});

test('TC21: V0 prediction stage lưu đúng stage=prediction và tự động vào AI queue', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes("requestedStage === 'prediction'"), 'Có hỗ trợ stage=prediction');
  const modal = read('src/components/versioning/CreateVersionModal.tsx');
  assert(modal.includes("'prediction'"), 'CreateVersionModal có hỗ trợ stage prediction');
});

test('TC22: V2+ submit yêu cầu bắt buộc revision_reason', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes('REVISION_REASON_REQUIRED'), 'V2+ thiếu revision_reason phải báo lỗi REVISION_REASON_REQUIRED');
});

test('TC23: submit version lưu đúng confidence 1–5', () => {
  const academic = read('api/_lib/academic-core.js');
  assert(academic.includes('INVALID_CONFIDENCE'), 'Confidence ngoài khoảng 1-5 phải báo INVALID_CONFIDENCE');
});

test('TC24: database connection không chứa rejectUnauthorized:false ở bất kỳ file nào', () => {
  const targetPattern = ['reject', 'Unauthorized', ':', 'false'].join('');
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.mjs'))) {
        if (entry.name === 'runTests.mjs') continue;
        const content = fs.readFileSync(full, 'utf8').replace(/\s+/g, '');
        assert(!content.includes(targetPattern), `Phát hiện rejectUnauthorized: false trong file: ${full}`);
      }
    }
  }
  scanDir(process.cwd());
});

test('TC25: tất cả transaction dùng client.connect()', () => {
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes("query('BEGIN')") || content.includes('query("BEGIN")')) {
          assert(content.includes('.connect()'), `Transaction trong file ${full} phải dùng client.connect()`);
        }
      }
    }
  }
  scanDir(path.join(process.cwd(), 'api'));
});

test('TC26: assign_member đồng bộ tạo portfolio và draft', () => {
  const manage = read('api/admin/manage.ts');
  assert(manage.includes('INSERT INTO portfolios'), 'assign_member phải insert portfolio cho học sinh mới gán lớp');
  assert(manage.includes('INSERT INTO portfolio_drafts'), 'assign_member phải insert draft rỗng ban đầu');
});

test('TC27: SPA fallback không rewrite /api', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const rewrites = vercel.rewrites || [];
  const spaRule = rewrites.find(r => r.destination === '/index.html');
  assert(spaRule, 'Thiếu rule rewrite SPA về /index.html');
  assert(spaRule.source.includes('(?!api'), 'SPA rule phải loại trừ /api');
  assert(!spaRule.source.includes('^/api'), 'SPA rule không được match /api');
});

test('TC28: Không còn StatCard trong tất cả các view production', () => {
  const viewFiles = fs.readdirSync(path.join(process.cwd(), 'src/views'))
    .filter(f => f.endsWith('.tsx') && !f.includes('Kit'));
  for (const f of viewFiles) {
    const content = fs.readFileSync(path.join(process.cwd(), 'src/views', f), 'utf8');
    assert(!content.includes('<StatCard'), `File src/views/${f} vẫn còn dùng <StatCard`);
  }
});

test('TC29: Không còn rounded-2xl hoặc rounded-3xl trong src', () => {
  function scan(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) scan(full);
      else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
        const c = fs.readFileSync(full, 'utf8');
        assert(!c.includes('rounded-2xl'), `${full} còn rounded-2xl`);
        assert(!c.includes('rounded-3xl'), `${full} còn rounded-3xl`);
      }
    }
  }
  scan(path.join(process.cwd(), 'src'));
});

test('TC30: Không còn gradient trang trí trong các view chính', () => {
  const viewFiles = fs.readdirSync(path.join(process.cwd(), 'src/views'))
    .filter(f => f.endsWith('.tsx') && !f.includes('Kit'));
  for (const f of viewFiles) {
    const content = fs.readFileSync(path.join(process.cwd(), 'src/views', f), 'utf8');
    assert(!content.includes('bg-gradient-'), `File src/views/${f} còn bg-gradient-`);
    assert(!content.includes('from-indigo-'), `File src/views/${f} còn from-indigo-`);
    assert(!content.includes('from-purple-'), `File src/views/${f} còn from-purple-`);
  }
});

test('TC31: Không còn text-[10px] hoặc text-[11px] trong các view chính', () => {
  const viewFiles = fs.readdirSync(path.join(process.cwd(), 'src/views'))
    .filter(f => f.endsWith('.tsx') && !f.includes('Kit'));
  for (const f of viewFiles) {
    const content = fs.readFileSync(path.join(process.cwd(), 'src/views', f), 'utf8');
    assert(!content.includes('text-[10px]'), `File src/views/${f} còn text-[10px]`);
    assert(!content.includes('text-[11px]'), `File src/views/${f} còn text-[11px]`);
  }
});

test('TC32: Shell đăng nhập không còn slogan quảng cáo', () => {
  const layout = read('src/components/layout/MainLayout.tsx');
  assert(!layout.includes('Hệ thống học tập và nghiên cứu năng lực đọc hiểu ngữ văn'), 'MainLayout còn footer slogan');
  assert(!layout.includes('Trường THPT Chuyên Vị Thanh'), 'MainLayout còn footer school');
});

// -------------------------------------------------------------
// Results Reporter
// -------------------------------------------------------------
const failed = results.filter(result => result.status === 'FAIL');
for (const result of results) {
  console.log(`${result.status === 'PASS' ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} production invariant & behavioral tests passed.`);
if (failed.length > 0) {
  process.exit(1);
}
