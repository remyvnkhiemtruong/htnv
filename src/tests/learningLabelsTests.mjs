import assert from 'node:assert/strict';
import { learningVersionLabel, learningText, readableAcademicData } from '../utils/learningLabels.ts';

for (const [number, expected] of [
  ['V0', 'Dự đoán trước khi đọc'], ['v0.0', 'Dự đoán trước khi đọc'],
  ['V1', 'Bài làm đầu tiên'], ['v1.0', 'Bài làm đầu tiên'],
  ['V2', 'Bài chỉnh sửa'], ['v2.0', 'Bài chỉnh sửa'],
  ['V3', 'Bài chỉnh sửa lần 2'], ['V10', 'Bài chỉnh sửa lần 9'],
  ['Bản nháp', 'Bản nháp']
]) assert.equal(learningVersionLabel(number), expected);
assert.equal(learningVersionLabel({ versionNumber: 'legacy', stage: 'prediction' }), 'Dự đoán trước khi đọc');
assert.equal(learningVersionLabel({ versionNumber: 'legacy', stage: 'revision' }), 'Bài chỉnh sửa');
assert.equal(learningText('Nộp V1 rồi sửa V2, hoàn thành REF1 trước khi chấm Rubric.'),
  'Nộp bài làm đầu tiên rồi sửa bài chỉnh sửa, hoàn thành phiếu tự nhìn lại bài làm trước khi chấm bảng tiêu chí chấm điểm.');
assert.equal(learningText('v1.0 và v2.0'), 'bài làm đầu tiên và bài chỉnh sửa');
assert.equal(learningText('Phiếu tự phản tư (REF1)'), 'Tự nhìn lại bài làm');

const original = {
  assignment: {
    id: 'V1', title: 'Đọc hiểu', rubricId: 'rubric-V1',
    guidingSteps: ['Nộp V0', 'Nộp V1', 'Hoàn thành REF1'],
    predictionTemplate: { prompt: 'V0 – Dự đoán trước khi đọc', questions: ['Em dự đoán gì ở V0?'] },
    readingGuide: 'Đọc rồi nộp V1.'
  },
  rubric: { id: 'rubric-V1', title: 'Rubric đánh giá', criteria: [{ description: 'Đọc lại V1.' }] },
  portfolio: { currentActiveVersion: 'V2', versions: [{ id: 'version-2', versionNumber: 'V2', stage: 'revision', responses: { axis: { analysisText: 'Trong V1, em viết REF1.' } } }] },
  reflections: [{ reflection: { incompleteInV1: 'Trong V1, em viết Rubric.' } }],
  literatureText: { title: 'V1 là nhan đề', content: 'REF1 là nội dung nguyên bản.' }
};
const baseline = structuredClone(original);
const presented = readableAcademicData(original);
assert.deepEqual(original, baseline, 'Presentation must not mutate stored data');
assert.equal(presented.assignment.id, 'V1');
assert.equal(presented.assignment.rubricId, 'rubric-V1');
assert.equal(presented.assignment.predictionTemplate.prompt, 'Dự đoán trước khi đọc');
assert.equal(presented.assignment.guidingSteps[2], 'Hoàn thành phiếu tự nhìn lại bài làm');
assert.equal(presented.rubric.title, 'Bảng tiêu chí chấm điểm');
assert.deepEqual(presented.portfolio, original.portfolio, 'Version IDs and submitted writing must stay intact');
assert.deepEqual(presented.reflections, original.reflections, 'Reflection answers must stay intact');
assert.deepEqual(presented.literatureText, original.literatureText, 'Literary source text must stay intact');
assert.deepEqual(readableAcademicData(presented), presented, 'Repeated reads must not duplicate labels');

// Both labels can be readable while selecting the same immutable submission identity.
const options = original.portfolio.versions.map(version => ({ value: version.versionNumber, label: learningVersionLabel(version) }));
assert.equal(options[0].label, 'Bài chỉnh sửa');
assert.equal(original.portfolio.versions.find(version => version.versionNumber === options[0].value)?.id, 'version-2');
console.log('PASS learning labels: versions, legacy instructions, immutable writing, submission identity');
