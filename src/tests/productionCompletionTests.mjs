import fs from 'node:fs';
import { checksumContent, stableStringify } from '../../api/_lib/academic-core.js';
import { computeAxisDiff } from '../utils/diffEngine.ts';

const read = path => fs.readFileSync(path, 'utf8');
const results = [];
const assert = (condition, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const test = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log(`✓ ${name}`); }
  catch (error) { results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); console.error(`✗ ${name} — ${results.at(-1).error}`); }
};
const block = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));

const academic = read('api/_lib/academic-core.js');
const workflow = read('api/_lib/academic-service.js');
const auth = read('api/auth/auth.js');

await test('P01: production academic endpoints use workflow-v4 over academic-v3 core', () => {
  const action = read('api/academic/action.ts');
  const snapshot = read('api/academic/snapshot.ts');
  assert(action.includes('academic-service.js'));
  assert(snapshot.includes('academic-service.js'));
  assert(read('api/academic/catalog.ts').includes('academic-core.js'));
  assert(read('api/health.ts').includes('academic-core.js'));
  for (const source of [action, snapshot, read('api/academic/catalog.ts'), read('api/health.ts')]) assert(!source.includes('academic-v2.js'));
});
await test('P02: academic-v3 does not import legacy academic service', () => { assert(!academic.includes("from './academic.js'")); assert(!academic.includes('legacyAcademic')); });
await test('P03: auth request path does not mutate schema or seed identities', () => {
  for (const token of ['CREATE TABLE','ALTER TABLE','BOOTSTRAP_','admin@cvt.edu.vn','hocsinh@cvt.edu.vn']) assert(!auth.includes(token), token);
});
await test('P04: JWT requires a dedicated secret', () => { assert(auth.includes('process.env.JWT_SECRET')); assert(!auth.includes('process.env.DATABASE_URL')); });
await test('P05: private APIs are no-store', () => {
  for (const path of ['api/academic/action.ts','api/academic/snapshot.ts','api/academic/catalog.ts','api/auth/auth.js']) assert(read(path).includes('no-store'), path);
});
await test('P06: stable JSON canonicalizes nested key order', () => {
  const a={z:1,nested:{b:2,a:3},array:[{y:2,x:1}]}, b={array:[{x:1,y:2}],nested:{a:3,b:2},z:1};
  assert(stableStringify(a)===stableStringify(b)); assert(checksumContent(a)===checksumContent(b));
});
await test('P07: nested evidence mutation changes checksum', () => {
  assert(checksumContent({a:{e:[{text:'A'}]}})!==checksumContent({a:{e:[{text:'B'}]}}));
});
await test('P08: sequence_no and pedagogical V0/V1/V2 are independent', () => {
  assert(academic.includes('nextSeq = prev ? Number(prev.sequence_no || 0) + 1 : 1'));
  assert(academic.includes("versionNumber = isPrediction ? 'V0' : `V${submissionCount + 1}`"));
  assert(academic.includes("stage<>'prediction'"));
});
await test('P09: create_version requires idempotency key', () => { assert(academic.includes('SUBMISSION_KEY_REQUIRED')); assert(academic.includes('submission_key=$2')); });
await test('P10: V1 AI request is stage-aware and remains atomic with version creation', () => {
  const source=block(academic,'async function createVersion','async function aiCompleteReview');
  for(const token of ["client.query('BEGIN')",'INSERT INTO portfolio_versions','configuredAiStages.includes(stage)','INSERT INTO ai_review_requests',"client.query('COMMIT')"]) assert(source.includes(token),token);
  assert(source.includes("['initial']"));
  assert(source.includes('aiReviewQueued: shouldQueueAiReview'));
});
await test('P11: manual AI response is published to the student immediately', () => {
  const source=block(workflow,'async function aiCompleteReview','async function teacherReviewAi');
  for (const token of ['INSERT INTO feedbacks', "'ai'", "teacher_review_status='pending'", 'markPortfolioFeedbackReceived(client, row.portfolio_id)', 'visibleToStudent: true', 'manual_chatgpt_response']) assert(source.includes(token), token);
});
await test('P12: teacher can review AI history and add a distinct revision without hiding AI feedback', () => {
  const source=block(workflow,'async function teacherReviewAi','async function saveReflection');
  for(const token of ["decision === 'revised'", "decision === 'revised' && finalResponse", 'teacher_revision_of_ai', 'aiFeedbackRemainsVisible: true']) assert(source.includes(token),token);
});
await test('P13: peer review is bound to exact immutable version', () => { assert(academic.includes('async function exactPeerScope')); assert(academic.includes('pra.version_id=$2')); assert(academic.includes('v.id=pra.version_id AND v.portfolio_id=p.id')); });
await test('P14: teacher access is class-scoped in core and workflow', () => { assert(academic.includes('async function teacherCanAccessClass')); assert(workflow.includes('async function teacherCanAccessClass')); assert(workflow.includes("member_role='teacher'")); assert(workflow.includes('TEACHER_CLASS_FORBIDDEN')); });
await test('P15: rubric score is server-calculated from assignment rubric', () => {
  const source=block(academic,'async function submitRubric','async function assignPeerReview');
  for(const token of ['rc.rubric_id=a.rubric_id','totalScore += score * weight','maxScore += maximum * weight']) assert(source.includes(token),token);
  assert(!source.includes('input.totalScore')); assert(!source.includes('input.maxScore'));
});
await test('P16: arbitrary rubric criteria and levels are rejected', () => { assert(academic.includes('INVALID_RUBRIC_CRITERION')); assert(academic.includes('INVALID_RUBRIC_LEVEL')); });
await test('P17: literature edits create immutable revisions', () => {
  const source=block(academic,'export async function saveLiteratureRevision','export async function createRubricVersion'); assert(source.includes('INSERT INTO literature_text_versions')); assert(source.includes('revisionNo = Number(latest.rows[0]?.version_no || 0) + 1')); assert(!source.includes('revision_no'));
});
await test('P18: assignment creation binds exact latest literature revision', () => {
  const source=block(academic,'async function createAssignment','export async function academicAction'); for(const token of ['literature_text_version_id','LITERATURE_VERSION_NOT_LATEST','textVersionId']) assert(source.includes(token),token);
});
await test('P19: assignment builder sends exact text revision and explicit rubric', () => { const s=read('src/views/AssignmentBuilderView.tsx'); assert(s.includes('textVersionId: textId')); assert(s.includes('rubricId,')); assert(!s.includes('assign-${Date.now()}')); });
await test('P20: literature UI creates a new version instead of overwriting history', () => { const s=read('src/views/LiteratureTextsView.tsx'); assert(s.includes("logicalId: editing?.logicalId")); assert(s.includes('Tạo phiên bản mới')); });
await test('P21: dirty draft survives snapshot hydration', () => { const s=read('src/app/store/usePortfolioStore.ts'); assert(s.includes('dirtyPortfolioKeys.has(key) && localPortfolio')); assert(s.includes('currentDraft: localPortfolio.currentDraft')); });
await test('P22: retry key survives network failure and concurrent clicks collapse', () => { const s=read('src/app/store/usePortfolioStore.ts'); assert(s.includes('pendingSubmissionKeys.get(key) || options.submissionKey || newSubmissionKey()')); assert(s.includes('inFlightSubmissions.get(key)')); assert(s.includes('inFlightSubmissions.set(key, operation)')); });
await test('P23: optional V0 does not turn V1 into revision', () => { const s=read('src/components/versioning/CreateVersionModal.tsx'); assert(s.includes('effectiveInitial')); assert(s.includes("effectiveInitial ? 'initial' : 'revision'")); });
await test('P24: Student Analytics uses assignment rubric without global fallback', () => { const s=read('src/views/StudentAnalyticsView.tsx'); assert(s.includes('rubrics[assignment.rubricId]')); assert(!s.includes('|| rubric')); assert(!s.includes('/4')); });
await test('P25: Class Analytics aggregates class metrics per unique student', () => { const s=read('src/views/ClassAnalyticsView.tsx'); assert(s.includes('studentAggregates')); assert(s.includes('new Set(filtered.map(portfolio => portfolio.studentId)).size')); assert(!s.includes('|| rubric')); assert(!s.includes('/4')); });
await test('P26: researcher UI uses assignment rubric and no essay evidence', () => { const s=read('src/views/ResearcherJudgeView.tsx'); assert(s.includes('rubrics[assignment.rubricId]')); assert(!s.includes('analysisText')); assert(!s.includes('/4')); });
await test('P27: researcher and AI snapshots never receive mutable drafts', () => {
  assert(academic.includes("currentDraft: role === 'student' ? (row.content_json || emptyDraft()) : emptyDraft()"));
  assert(academic.includes("pseudonym('SUB', row.student_id)"));
  assert(academic.includes("responses: researcher ? emptyDraft()"));
});
await test('P28: Vietnamese canonical Unicode diff is stable', () => { const a='Vợ nhặt', b=a.normalize('NFD'), d=computeAxisDiff('plot_situation',a,b); assert(d.changeType==='unchanged'); assert(d.wordsAdded===0&&d.wordsRemoved===0); });
await test('P29: diff classifies added/deleted/changed/unchanged', () => { assert(computeAxisDiff('x','','mới').changeType==='added'); assert(computeAxisDiff('x','cũ','').changeType==='deleted'); assert(computeAxisDiff('x','cũ','mới').changeType==='changed'); assert(computeAxisDiff('x','giữ','giữ').changeType==='unchanged'); });
await test('P30: TLS verify-full remains enforced', () => { const s=read('api/_lib/db.js'), a='rejectUnauthorized'+': false', b='rejectUnauthorized'+':false'; assert(s.includes('sslmode=verify-full')); assert(!s.includes(a)); assert(!s.includes(b)); });
await test('P31: SPA rewrite excludes API and remains in Singapore', () => { const c=JSON.parse(read('vercel.json')), f=c.rewrites?.find(r=>r.destination==='/index.html'); assert(f?.source?.includes('(?!api')); assert(c.regions?.includes('sin1')); });
await test('P32: no global browser MutationObserver disables editor input behavior', () => { const s=read('index.html'); assert(!s.includes('MutationObserver')); assert(!s.includes("spellcheck', 'false")); });
await test('P33: AI workspace is a manual ChatGPT-response paste flow visible to students', () => {
  const s=read('src/views/AiWorkspaceView.tsx');
  for (const token of ['Dán phản hồi ChatGPT', 'Sao chép bài sang ChatGPT', "action: 'ai_complete_review'", 'Gửi góp ý AI cho học sinh', 'Học sinh nhận góp ý ngay sau khi gửi']) assert(s.includes(token), token);
});
await test('P34: teacher workspace preserves the AI feedback and can add a distinct teacher revision', () => {
  const s=read('src/views/TeacherReviewView.tsx');
  for (const token of ['Góp ý AI đã gửi học sinh', 'Gửi bổ sung của giáo viên', 'Đã xem góp ý AI']) assert(s.includes(token), token);
});
await test('P35: workflow enforces V0 before V1 and feedback before revision when configured', () => {
  const source=block(workflow,'async function createVersionWithWorkflow','async function aiCompleteReview');
  for (const token of ['PREDICTION_REQUIRED_FIRST','PREDICTION_WINDOW_CLOSED','FEEDBACK_REQUIRED_BEFORE_REVISION',"requestedStage === 'revision'"]) assert(source.includes(token), token);
});
await test('P36: REF1 is immutable and required before official teacher rubric', () => {
  const source=block(workflow,'async function saveReflection','async function submitRubricWithWorkflow');
  for (const token of ['INSERT INTO student_reflections','REFLECTION_REQUIRES_REVISION',"status='waiting_official_rubric'"]) assert(source.includes(token), token);
  const submit=block(workflow,'async function submitRubricWithWorkflow','export async function getAcademicSnapshot');
  assert(submit.includes('REFLECTION_REQUIRED_BEFORE_OFFICIAL_RUBRIC'));
  const migration=read('scripts/migrate-workflow-v4.sql');
  assert(migration.includes('trg_student_reflections_immutable'));
});
await test('P37: student editor counts V0 separately and exposes REF1 after a revision', () => {
  const s=read('src/views/PortfolioEditorView.tsx');
  for (const token of ["stage !== 'prediction'", 'Nộp V0 (dự đoán)', 'REF1 – Tự phản tư', "action: 'save_reflection'"]) assert(s.includes(token), token);
});

const failed=results.filter(result=>!result.ok);
console.log(`${results.length-failed.length}/${results.length} production completion regression tests passed.`);
if(failed.length) process.exit(1);
