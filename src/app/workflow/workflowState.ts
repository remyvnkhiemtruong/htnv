import type { Assignment, FeedbackItem, RubricAssessmentSubmission, StudentPortfolio } from '../../types';

export type WorkflowStepId = 'prediction' | 'initial' | 'feedback' | 'revision' | 'reflection' | 'rubric';
export type WorkflowTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'violet';

export interface WorkflowStepState {
  id: WorkflowStepId;
  label: string;
  shortLabel: string;
  done: boolean;
  active: boolean;
}

export interface StudentWorkflowState {
  statusLabel: string;
  nextActionLabel: string;
  nextActionHint: string;
  tone: WorkflowTone;
  progress: number;
  isComplete: boolean;
  canEdit: boolean;
  steps: WorkflowStepState[];
}

export const academicVersionsOf = (portfolio?: StudentPortfolio | null) =>
  (portfolio?.versions || []).filter(version => version.stage !== 'prediction');

export function deriveStudentWorkflow(input: {
  assignment: Assignment;
  portfolio?: StudentPortfolio | null;
  feedbacks?: FeedbackItem[];
  rubricSubmissions?: RubricAssessmentSubmission[];
  reflectionVersionIds?: string[];
}): StudentWorkflowState {
  const { assignment, portfolio, feedbacks = [], rubricSubmissions = [], reflectionVersionIds = [] } = input;
  const versions = portfolio?.versions || [];
  const prediction = versions.some(version => version.stage === 'prediction');
  const academicVersions = academicVersionsOf(portfolio);
  const revision = [...academicVersions].reverse().find(version => version.stage === 'revision');
  const predictionRequired = assignment.workflowConfig?.predictionEnabled !== false;
  const reflectionRequired = assignment.workflowConfig?.reflectionRequired !== false;
  const rubricRequired = assignment.workflowConfig?.officialRubricRequired !== false;
  const hasFeedback = Boolean(portfolio && feedbacks.some(item => item.assignmentId === assignment.id && item.studentId === portfolio.studentId));
  const hasReflection = Boolean(revision && reflectionVersionIds.includes(revision.id));
  const hasTeacherRubric = Boolean(portfolio && rubricSubmissions.some(item => item.assignmentId === assignment.id && item.studentId === portfolio.studentId && item.evaluatorRole === 'teacher'));
  const isComplete = hasTeacherRubric || portfolio?.status === 'completed';
  // Older stages may be retained outside the visible academic record. Do not
  // mark an unseen V0/V1 as unfinished (or imply it is an official submission).
  const historicalStagesVisible = !portfolio || portfolio.status !== 'completed'
    || versions.some(version => version.stage === 'prediction' || version.stage === 'initial');

  const base: Array<Omit<WorkflowStepState, 'active'>> = [];
  if (predictionRequired && historicalStagesVisible) base.push({ id: 'prediction', label: 'Dự đoán trước khi đọc', shortLabel: 'Dự đoán', done: prediction });
  if (historicalStagesVisible) base.push({ id: 'initial', label: 'Bài làm đầu tiên', shortLabel: 'Bài đầu tiên', done: academicVersions.length > 0 });
  base.push({ id: 'feedback', label: 'Nhận góp ý', shortLabel: 'Góp ý', done: hasFeedback });
  base.push({ id: 'revision', label: 'Bài chỉnh sửa', shortLabel: 'Sửa bài', done: Boolean(revision) });
  if (reflectionRequired) base.push({ id: 'reflection', label: 'Tự nhìn lại bài làm', shortLabel: 'Tự nhìn lại', done: hasReflection });
  if (rubricRequired) base.push({ id: 'rubric', label: 'Giáo viên chấm điểm', shortLabel: 'Chấm điểm', done: hasTeacherRubric });
  const activeIndex = base.findIndex(step => !step.done);
  // A teacher can close an existing record without requiring another submission.
  // Show the steps actually recorded, rather than asking the student to resume
  // an unfinished revision or implying those waived steps were submitted.
  const steps = base.filter(step => !isComplete || step.done)
    .map(step => ({ ...step, active: !isComplete && base.indexOf(step) === activeIndex }));
  const progress = base.length ? Math.round((base.filter(step => step.done).length / base.length) * 100) : 0;

  const make = (statusLabel: string, nextActionLabel: string, nextActionHint: string, tone: WorkflowTone, canEdit: boolean, isComplete = false): StudentWorkflowState => ({
    statusLabel, nextActionLabel, nextActionHint, tone, canEdit, isComplete, progress: isComplete ? 100 : progress, steps
  });

  if (isComplete) return make('Hoàn thành', 'Xem hồ sơ hoàn chỉnh', 'Giáo viên đã chấm bài. Em có thể xem điểm và nhận xét.', 'emerald', false, true);
  if (!portfolio) return predictionRequired
    ? make('Cần ghi dự đoán', 'Ghi dự đoán trước khi đọc', 'Ghi dự đoán trước khi đọc, sau đó viết và nộp bài đầu tiên.', 'blue', true)
    : make('Đang viết bài đầu tiên', 'Bắt đầu làm bài', 'Mở bài và hoàn thiện bản đầu tiên.', 'blue', true);
  if (predictionRequired && !prediction && academicVersions.length === 0) return make('Cần ghi dự đoán', 'Ghi dự đoán trước khi đọc', 'Ghi dự đoán trước khi đọc, sau đó viết và nộp bài đầu tiên.', 'blue', true);
  if (academicVersions.length === 0) return make('Đang viết bài đầu tiên', 'Tiếp tục bài đầu tiên', 'Hoàn thiện bản đầu tiên để gửi phản hồi.', 'blue', true);
  if (!hasFeedback) return make('Chờ phản hồi', 'Xem bài đầu tiên đã nộp', 'Bài đầu tiên đã nộp và đang chờ góp ý.', 'violet', false);
  if (!revision) return make('Cần chỉnh sửa', 'Xem góp ý rồi sửa bài', 'Đọc góp ý, sửa bài rồi nộp bản chỉnh sửa.', 'amber', true);
  if (reflectionRequired && !hasReflection) return make('Cần tự nhìn lại bài làm', 'Tự nhìn lại bài làm', 'Bài chỉnh sửa đã nộp. Hoàn thành phần tự nhìn lại trước khi giáo viên chấm.', 'blue', false);
  return make('Chờ giáo viên chấm', 'Xem hồ sơ đã nộp', 'Hồ sơ đang chờ giáo viên chấm chính thức.', 'violet', false);
}
