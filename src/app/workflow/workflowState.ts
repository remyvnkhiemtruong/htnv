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
  // Older stages may be retained outside the visible academic record. Do not
  // mark an unseen V0/V1 as unfinished (or imply it is an official submission).
  const historicalStagesVisible = !portfolio || portfolio.status !== 'completed'
    || versions.some(version => version.stage === 'prediction' || version.stage === 'initial');

  const base: Array<Omit<WorkflowStepState, 'active'>> = [];
  if (predictionRequired && historicalStagesVisible) base.push({ id: 'prediction', label: 'Dự đoán V0', shortLabel: 'V0', done: prediction });
  if (historicalStagesVisible) base.push({ id: 'initial', label: 'Bản đầu V1', shortLabel: 'V1', done: academicVersions.length > 0 });
  base.push({ id: 'feedback', label: 'Nhận góp ý', shortLabel: 'Góp ý', done: hasFeedback });
  base.push({ id: 'revision', label: 'Chỉnh sửa V2', shortLabel: 'V2', done: Boolean(revision) });
  if (reflectionRequired) base.push({ id: 'reflection', label: 'Tự phản tư REF1', shortLabel: 'REF1', done: hasReflection });
  if (rubricRequired) base.push({ id: 'rubric', label: 'Rubric chính thức', shortLabel: 'Rubric', done: hasTeacherRubric });
  const activeIndex = base.findIndex(step => !step.done);
  const steps = base.map((step, index) => ({ ...step, active: activeIndex === index }));
  const progress = base.length ? Math.round((base.filter(step => step.done).length / base.length) * 100) : 0;

  const make = (statusLabel: string, nextActionLabel: string, nextActionHint: string, tone: WorkflowTone, canEdit: boolean, isComplete = false): StudentWorkflowState => ({
    statusLabel, nextActionLabel, nextActionHint, tone, canEdit, isComplete, progress: isComplete ? 100 : progress, steps
  });

  if (hasTeacherRubric || portfolio?.status === 'completed') return make('Hoàn thành', 'Xem hồ sơ hoàn chỉnh', 'Bài đã có Rubric chính thức của giáo viên.', 'emerald', false, true);
  if (!portfolio) return predictionRequired
    ? make('Cần làm V0', 'Hoàn thành V0', 'Ghi dự đoán trước đọc rồi mới nộp V1.', 'blue', true)
    : make('Đang viết V1', 'Bắt đầu V1', 'Mở bài và hoàn thiện bản đầu tiên.', 'blue', true);
  if (predictionRequired && !prediction && academicVersions.length === 0) return make('Cần làm V0', 'Hoàn thành V0', 'Ghi dự đoán trước đọc rồi mới nộp V1.', 'blue', true);
  if (academicVersions.length === 0) return make('Đang viết V1', 'Tiếp tục và nộp V1', 'Hoàn thiện bản đầu tiên để gửi phản hồi.', 'blue', true);
  if (!hasFeedback) return make('Chờ phản hồi', 'Xem V1 đã nộp', 'V1 đã khóa và đang chờ phản hồi.', 'violet', false);
  if (!revision) return make('Cần chỉnh sửa', 'Xem góp ý và sửa V2', 'Đọc góp ý, chỉnh bài và nộp V2.', 'amber', true);
  if (reflectionRequired && !hasReflection) return make('Cần REF1', 'Hoàn thành tự phản tư', 'V2 đã nộp. Hoàn thành REF1 trước Rubric.', 'blue', false);
  return make('Chờ chấm Rubric', 'Xem hồ sơ đã nộp', 'Hồ sơ đang chờ giáo viên chấm chính thức.', 'violet', false);
}
