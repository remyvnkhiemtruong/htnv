import { learningVersionLabel } from './learningLabels';
import type { PoeticAxisId, TaskRecommendation, RubricAssessmentSubmission, Assignment } from '../types';

const AXIS_TITLE_MAP: Record<PoeticAxisId, string> = {
  plot_situation: 'Tình huống – Cốt truyện',
  character_detail: 'Nhân vật – Chi tiết nghệ thuật',
  narrator_pov: 'Người kể chuyện – Điểm nhìn',
  space_time: 'Không gian – Thời gian nghệ thuật',
  language_tone_symbol: 'Ngôn ngữ – Giọng điệu – Biểu tượng',
  form_argument: 'Tính chỉnh thể & Lập luận'
};

const EMPTY_RECOMMENDATION: TaskRecommendation = {
  nextAssignmentId: '',
  assignmentTitle: 'Chưa có nhiệm vụ tiếp theo',
  targetAxisId: 'plot_situation',
  targetAxisTitle: AXIS_TITLE_MAP.plot_situation,
  rationale: 'Chưa có bài để đề xuất. Liên hệ giáo viên để được giao bài.',
  expectedGain: 'Gợi ý sẽ xuất hiện khi có bài được giao.'
};

export function getExplainableRecommendation(
  latestRubric: RubricAssessmentSubmission | undefined,
  availableAssignments: Assignment[],
  currentAssignmentId: string
): TaskRecommendation {
  const candidates = availableAssignments.filter(assignment => assignment.id !== currentAssignmentId);
  const fallback = candidates[0] || availableAssignments[0];

  if (!fallback) return EMPTY_RECOMMENDATION;

  if (!latestRubric || !latestRubric.criterionScores) {
    return {
      nextAssignmentId: fallback.id,
      assignmentTitle: fallback.title,
      targetAxisId: 'plot_situation',
      targetAxisTitle: AXIS_TITLE_MAP.plot_situation,
      rationale: 'Chưa có điểm bảng tiêu chí chấm điểm để chọn phần cần luyện. Có thể bắt đầu từ tình huống và cốt truyện.',
      expectedGain: 'Xác định tình huống, xung đột và bước ngoặt trong truyện.'
    };
  }

  const criteria = latestRubric.criterionScores;
  const scoresByAxis: { axisId: PoeticAxisId; score: number }[] = [
    { axisId: 'plot_situation', score: criteria['criterion-plot']?.score ?? criteria['crit-plot']?.score ?? 3 },
    { axisId: 'character_detail', score: criteria['criterion-character']?.score ?? criteria['crit-char']?.score ?? 3 },
    { axisId: 'narrator_pov', score: criteria['criterion-narrator']?.score ?? criteria['crit-pov']?.score ?? 3 },
    { axisId: 'space_time', score: criteria['criterion-space']?.score ?? criteria['crit-spacetime']?.score ?? 3 },
    { axisId: 'language_tone_symbol', score: criteria['criterion-language']?.score ?? criteria['crit-lang']?.score ?? 3 },
    { axisId: 'form_argument', score: criteria['criterion-form']?.score ?? criteria['crit-synthesis']?.score ?? 3 }
  ];

  scoresByAxis.sort((a, b) => a.score - b.score);
  const weakest = scoresByAxis[0];
  const matchedAssignment = candidates.find(assignment => assignment.targetAxes.includes(weakest.axisId)) || fallback;

  let rationale = `Theo kết quả chấm gần nhất (${learningVersionLabel(latestRubric.versionNumber)}), trục [${AXIS_TITLE_MAP[weakest.axisId]}] đạt ${weakest.score}/4. `;
  if (weakest.axisId === 'narrator_pov') rationale += 'Nên luyện nhận diện sự chuyển dịch điểm nhìn và lời nửa trực tiếp.';
  else if (weakest.axisId === 'space_time') rationale += 'Nên luyện phân tích tương phản không gian và thời gian tâm trạng.';
  else if (weakest.axisId === 'language_tone_symbol') rationale += 'Nên giải thích biểu tượng và giọng điệu bằng dẫn chứng.';
  else if (weakest.axisId === 'character_detail') rationale += 'Nên chọn chi tiết và giải thích điều chúng cho thấy về nhân vật.';
  else if (weakest.axisId === 'plot_situation') rationale += 'Nên củng cố cách nhận diện tình huống, thắt nút và mở nút.';
  else rationale += 'Nên tăng tính liên kết giữa hình thức nghệ thuật, dẫn chứng và lập luận.';

  return {
    nextAssignmentId: matchedAssignment.id,
    assignmentTitle: matchedAssignment.title,
    targetAxisId: weakest.axisId,
    targetAxisTitle: AXIS_TITLE_MAP[weakest.axisId],
    rationale,
    expectedGain: `Luyện trục ${AXIS_TITLE_MAP[weakest.axisId]}; mức tiếp theo cần đạt là ${Math.min(4, weakest.score + 1)}/4.`
  };
}
