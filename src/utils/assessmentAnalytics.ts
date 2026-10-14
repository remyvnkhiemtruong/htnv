import type { PortfolioVersion, RubricAssessmentSubmission } from '../types';

export function assessmentPercentage(submission: RubricAssessmentSubmission | undefined): number | null {
  if (!submission || submission.totalScore == null || submission.maxScore == null) return null;
  const total = Number(submission.totalScore);
  const max = Number(submission.maxScore);
  return Number.isFinite(total) && Number.isFinite(max) && max > 0 && total >= 0 && total <= max
    ? (total / max) * 100
    : null;
}

// A second teacher grading the same submitted version is not another learning step.
export function teacherAssessmentsByVersion(
  submissions: RubricAssessmentSubmission[],
  versions: PortfolioVersion[] = []
): RubricAssessmentSubmission[] {
  const time = (item: RubricAssessmentSubmission) => Date.parse(item.submittedAt) || 0;
  const versionFor = (item: RubricAssessmentSubmission) => versions.find(version =>
    item.versionId ? version.id === item.versionId : version.versionNumber === item.versionNumber
  );
  const order = (item: RubricAssessmentSubmission) => {
    const version = versionFor(item);
    if (Number.isFinite(version?.sequenceNo)) return Number(version!.sequenceNo);
    const number = /^V(\d+)$/i.exec(version?.versionNumber || item.versionNumber);
    return number ? Number(number[1]) : null;
  };
  const byVersion = new Map<string, RubricAssessmentSubmission>();
  for (const item of submissions) {
    if (item.evaluatorRole !== 'teacher') continue;
    const versionKey = versionFor(item)?.id || item.versionId || item.versionNumber;
    const key = JSON.stringify([item.studentId, item.assignmentId, versionKey]);
    const previous = byVersion.get(key);
    if (!previous || time(item) > time(previous) || (time(item) === time(previous) && item.id > previous.id)) {
      byVersion.set(key, item);
    }
  }
  return [...byVersion.values()].sort((a, b) => {
    const aOrder = order(a), bOrder = order(b);
    return aOrder !== null && bOrder !== null && aOrder !== bOrder
      ? aOrder - bOrder
      : time(a) - time(b) || a.id.localeCompare(b.id);
  });
}
