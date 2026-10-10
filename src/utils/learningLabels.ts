type LearningVersion = string | { versionNumber?: string; stage?: string } | null | undefined;

/** Display names only; callers keep the original version numbers for selection and submission. */
export function learningVersionLabel(version: LearningVersion): string {
  const number = typeof version === 'string' ? version : version?.versionNumber || '';
  const stage = typeof version === 'object' && version ? version.stage : undefined;
  const match = /^v?(\d+)(?:\.0)?$/i.exec(number.trim());
  const index = match ? Number(match[1]) : null;
  if (stage === 'prediction' || index === 0) return 'Dự đoán trước khi đọc';
  if (stage === 'initial' || index === 1) return 'Bài làm đầu tiên';
  if (index !== null && index >= 2) return index === 2 ? 'Bài chỉnh sửa' : `Bài chỉnh sửa lần ${index - 1}`;
  if (stage === 'revision') return 'Bài chỉnh sửa';
  return learningText(number);
}

/** Translate legacy task instructions at the display boundary without rewriting stored content. */
export function learningText(value: string | null | undefined): string {
  return String(value || '')
    .replace(/\bV0(?:\.0)?\s+trước\s+(?:khi\s+)?đọc/gi, 'dự đoán trước khi đọc')
    .replace(/\bV0(?:\.0)?\s*[–—-]\s*Dự đoán trước (?:khi )?đọc/gi, 'Dự đoán trước khi đọc')
    .replace(/(?:ma trận\s+)?rubric\s+(?:đánh giá|chính thức)/gi, 'bảng tiêu chí chấm điểm')
    .replace(/phiếu\s+REF\d*/gi, 'phiếu tự nhìn lại bài làm')
    .replace(/\bV1\s*[/+]\s*V2\b/gi, 'bài đầu tiên và bài chỉnh sửa')
    .replace(/\bV1\+/g, 'bài đã nộp')
    .replace(/(?:bản\s+)?dự đoán\s+V0(?:\.0)?\b/gi, 'dự đoán trước khi đọc')
    .replace(/bài(?: làm)?\s+V1(?:\.0)?\b/gi, 'bài làm đầu tiên')
    .replace(/(?:bản\s+)?chỉnh sửa\s+V2(?:\.0)?\b/gi, 'bài chỉnh sửa')
    .replace(/ma trận\s+rubric/gi, 'bảng tiêu chí chấm điểm')
    .replace(/\bV0\s*\(dự đoán\)/gi, 'dự đoán trước khi đọc')
    .replace(/(?:Phiếu\s+)?tự phản tư\s*\(REF\d*\)/gi, 'Tự nhìn lại bài làm')
    .replace(/(?:Phiếu\s+)?tự phản tư\s+REF\d*/gi, 'Tự nhìn lại bài làm')
    .replace(/\bREF\d*\s*[–—-]\s*Tự phản tư/gi, 'Tự nhìn lại bài làm')
    .replace(/\bREF\d*\b/gi, 'phiếu tự nhìn lại bài làm')
    .replace(/tự phản tư/gi, 'tự nhìn lại bài làm')
    .replace(/\bV0(?:\.0)?\b/gi, 'dự đoán trước khi đọc')
    .replace(/\bV1(?:\.0)?\b/gi, 'bài làm đầu tiên')
    .replace(/\bV(\d+)(?:\.0)?\b/gi, (_, number: string) => {
      const index = Number(number);
      return index === 2 ? 'bài chỉnh sửa' : `bài chỉnh sửa lần ${index - 1}`;
    })
    .replace(/\brubric\b/gi, 'bảng tiêu chí chấm điểm')
    .replace(/6 trục thi pháp/gi, '6 phần phân tích')
    .replace(/trục thi pháp/gi, 'phần phân tích')
    .replace(/^bảng tiêu chí chấm điểm/, 'Bảng tiêu chí chấm điểm');
}

const instructionFields = new Set([
  'title', 'description', 'prompt', 'guidingSteps', 'aiGuidance',
  'commonMistakes', 'referenceGuide', 'questions', 'readingGuide', 'label', 'shortLabel'
]);
const originalContentFields = new Set([
  'literatureText', 'literatureTexts', 'portfolios', 'portfolio', 'responses', 'draftResponses',
  'reflection', 'reflections', 'feedbacks', 'aiReviews', 'auditLogs', 'users'
]);

/** Present old assignment instructions in plain language; never change identifiers or submitted writing. */
export function readableAcademicData<T>(value: T): T {
  function visit(item: unknown, field = ''): unknown {
    if (originalContentFields.has(field)) return item;
    if (typeof item === 'string') return instructionFields.has(field) ? learningText(item) : item;
    if (Array.isArray(item)) return item.map(entry => visit(entry, field));
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, visit(entry, key)]));
    }
    return item;
  }
  return visit(value) as T;
}
