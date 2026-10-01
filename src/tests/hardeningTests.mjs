import fs from 'node:fs';
import { stableStringify, checksumContent } from '../../api/_lib/academic-core.js';

const results = [];
const read = path => fs.readFileSync(path, 'utf8');
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    console.error(`✗ ${name} — ${results.at(-1).error}`);
  }
};
const assert = (condition, message) => { if (!condition) throw new Error(message || 'Assertion failed'); };

await test('H01: VersionDiff truyền đủ axisId, before và after vào production diff helper', () => {
  const source = read('src/views/VersionDiffView.tsx');
  assert(source.includes('computeAxisDiff(axis.id, v1Text, v2Text)'), 'VersionDiff phải gọi computeAxisDiff(axis.id, v1Text, v2Text)');
  assert(!source.includes('computeAxisDiff(v1Text, v2Text)'), 'Không được gọi thiếu axisId');
});

await test('H02: AI workspace tuyệt đối không fallback sang mutable currentDraft', () => {
  const source = read('src/views/AiWorkspaceView.tsx');
  assert(!source.includes('currentPortfolio?.currentDraft?.[axis.id]'), 'AI review còn fallback currentDraft');
  assert(source.includes('integrityError'), 'AI workspace phải có integrity guard');
  assert(source.includes('!currentVersion'), 'AI workspace phải chặn khi thiếu immutable version');
});

await test('H03: Teacher review chấm immutable selectedSnapshot, không fallback currentDraft', () => {
  const source = read('src/views/TeacherReviewView.tsx');
  assert(!source.includes('selectedSnapshot?.responses || currentPortfolio?.currentDraft'), 'Teacher review còn fallback draft');
  assert(source.includes('!selectedSnapshot || integrityError'), 'Teacher review phải chặn version integrity error');
});

await test('H04: canonical JSON ổn định bất kể thứ tự key object', () => {
  const a = { z: 1, nested: { b: 2, a: 3 }, list: [{ y: 2, x: 1 }] };
  const b = { list: [{ x: 1, y: 2 }], nested: { a: 3, b: 2 }, z: 1 };
  assert(stableStringify(a) === stableStringify(b), 'Stable serializer chưa recursive/canonical');
  assert(checksumContent(a) === checksumContent(b), 'Cùng nội dung canonical phải cùng checksum');
});

await test('H05: thay một từ nested trong bài làm làm checksum thay đổi', () => {
  const a = { plot_situation: { axisId: 'plot_situation', analysisText: 'Tràng bước ra sân.', evidenceQuotes: [] } };
  const b = { plot_situation: { axisId: 'plot_situation', analysisText: 'Tràng chậm rãi bước ra sân.', evidenceQuotes: [] } };
  assert(checksumContent(a) !== checksumContent(b), 'Checksum không phản ánh nested analysisText');
});

await test('H06: thay một dẫn chứng nested làm checksum thay đổi', () => {
  const a = { plot_situation: { axisId: 'plot_situation', analysisText: 'A', evidenceQuotes: [{ id: 'q1', text: 'Dẫn chứng A' }] } };
  const b = { plot_situation: { axisId: 'plot_situation', analysisText: 'A', evidenceQuotes: [{ id: 'q1', text: 'Dẫn chứng B' }] } };
  assert(checksumContent(a) !== checksumContent(b), 'Checksum không phản ánh nested evidence quote');
});

await test('H07: create_version tách sequence_no khỏi số phiên bản sư phạm V0/V1/V2', () => {
  const source = read('api/_lib/academic-core.js');
  assert(source.includes("stage <> 'prediction'"), 'Phải đếm riêng các version không phải prediction');
  assert(source.includes("isPrediction ? 'v0.0' : `v${nonPredictionCount + 1}.0`"), 'Display version phải dùng nonPredictionCount');
  assert(source.includes('nextSeq = prevVersion ? Number(prevVersion.sequence_no || 0) + 1 : 1'), 'sequence_no vẫn phải tăng độc lập');
});

await test('H08: mỗi create_version tạo AI request trong cùng service transaction', () => {
  const source = read('api/_lib/academic-core.js');
  const start = source.indexOf('async function createVersion');
  const end = source.indexOf('async function teacherReviewAi');
  const block = source.slice(start, end);
  assert(block.includes("await client.query('BEGIN')"), 'createVersion phải mở transaction');
  assert(block.includes('INSERT INTO portfolio_versions'), 'createVersion phải freeze immutable version');
  assert(block.includes('INSERT INTO ai_review_requests'), 'createVersion phải tạo AI queue item');
  assert(block.includes("await client.query('COMMIT')"), 'createVersion phải commit atomically');
});

await test('H09: teacher AI finalization có idempotency và unique provenance', () => {
  const source = read('api/_lib/academic-core.js');
  assert(source.includes('idx_feedbacks_ai_review_unique'), 'Thiếu unique index source_ai_review_id');
  assert(source.includes("row.teacher_review_status !== 'pending'"), 'Teacher finalize phải kiểm trạng thái pending');
  assert(source.includes('isIdempotentRetry: true'), 'Retry finalization phải trả idempotent result');
});

await test('H10: reject AI không làm workflow kẹt ở trạng thái chờ duyệt', () => {
  const source = read('api/_lib/academic-core.js');
  assert(source.includes("'teacher_feedback_needed'"), 'Thiếu trạng thái teacher_feedback_needed');
});

await test('H11: rubric score được tính ở server theo rubric assignment', () => {
  const source = read('api/_lib/academic-core.js');
  const start = source.indexOf('async function submitRubric');
  const end = source.indexOf('async function assignPeerReview');
  const block = source.slice(start, end);
  assert(block.includes('JOIN rubric_criteria rc ON rc.rubric_id = a.rubric_id'), 'Rubric phải lấy theo assignment.rubric_id');
  assert(block.includes('totalScore += score * weight'), 'Server phải tự tính totalScore');
  assert(block.includes('maxScore += maximum * weight'), 'Server phải tự tính maxScore');
  assert(!block.includes('Number(input.totalScore'), 'Không được tin totalScore client');
});

await test('H12: linked feedback chỉ được lấy từ cùng portfolio', () => {
  const source = read('api/_lib/academic-core.js');
  assert(source.includes('f.portfolio_id = $3'), 'Feedback link phải scope cùng portfolio');
  assert(source.includes('version_feedback_links_feedback_fk'), 'Thiếu FK feedback provenance');
});

await test('H13: snapshot cung cấp rubric map theo assignment rubricId', () => {
  const service = read('api/_lib/academic-core.js');
  const context = read('src/contexts/PortfolioContext.tsx');
  const review = read('src/views/TeacherReviewView.tsx');
  assert(service.includes('return { assignments, literatureTexts, rubric: primaryRubric, rubrics'), 'Backend chưa trả rubric map');
  assert(context.includes('rubrics: Record<string, RubricMatrix>'), 'Context chưa expose rubric map');
  assert(review.includes('rubrics[assignment.rubricId] || rubric'), 'Teacher review chưa chọn rubric theo assignment');
});

await test('H14: global spellcheck/autofill MutationObserver đã bị loại khỏi index', () => {
  const source = read('index.html');
  assert(!source.includes('MutationObserver'), 'index.html còn MutationObserver toàn cục');
  assert(!source.includes("spellcheck', 'false"), 'index.html còn tắt spellcheck toàn cục');
});

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} hardening regression tests passed.`);
if (failed.length) process.exit(1);
