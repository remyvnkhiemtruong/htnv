import React, { useState } from 'react';
import type { RubricMatrix, RubricAssessmentSubmission } from '../../types';
import { POETIC_AXES } from '../../data/seedData';
import { CheckCircle, Award, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RubricAssessmentGridProps {
  rubric: RubricMatrix;
  versionNumber: string;
  studentId: string;
  assignmentId: string;
  existingSubmissions: RubricAssessmentSubmission[];
  onSubmitAssessment?: (evaluation: Omit<RubricAssessmentSubmission, 'id' | 'submittedAt'>) => void;
  isReadOnly?: boolean;
}

export const RubricAssessmentGrid: React.FC<RubricAssessmentGridProps> = ({
  rubric,
  versionNumber,
  studentId,
  assignmentId,
  existingSubmissions,
  onSubmitAssessment,
  isReadOnly = false
}) => {
  const { currentUser } = useAuth();

  // Find submissions for this version
  const versionSubs = existingSubmissions.filter(s => s.versionNumber === versionNumber);
  const teacherSub = versionSubs.find(s => s.evaluatorRole === 'teacher');
  const selfSub = versionSubs.find(s => s.evaluatorRole === 'student');
  const peerSub = versionSubs.find(s => s.evaluatorRole === 'peer');

  // Local state for grading
  const [selectedLevels, setSelectedLevels] = useState<Record<string, { level: number; score: number; note: string }>>(() => {
    // Initialise with existing current user's evaluation or defaults
    const mySub = versionSubs.find(s => s.evaluatorId === currentUser.id);
    if (mySub) return mySub.criterionScores;

    const initial: Record<string, { level: number; score: number; note: string }> = {};
    rubric.criteria.forEach(c => {
      initial[c.id] = { level: 2, score: 2.0, note: '' };
    });
    return initial;
  });

  const [overallFeedback, setOverallFeedback] = useState(() => {
    const mySub = versionSubs.find(s => s.evaluatorId === currentUser.id);
    return mySub?.overallFeedback || '';
  });

  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const calculateTotal = () => {
    let sum = 0;
    Object.values(selectedLevels).forEach(v => {
      sum += v.score || 0;
    });
    return sum;
  };

  const totalScore = calculateTotal();
  const maxScore = rubric.criteria.length * 4;

  const handleSelectLevel = (critId: string, levelNum: number, scoreVal: number) => {
    if (isReadOnly) return;
    setSelectedLevels(prev => ({
      ...prev,
      [critId]: {
        ...prev[critId],
        level: levelNum,
        score: scoreVal
      }
    }));
  };

  const handleNoteChange = (critId: string, note: string) => {
    if (isReadOnly) return;
    setSelectedLevels(prev => ({
      ...prev,
      [critId]: {
        ...prev[critId],
        note
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitAssessment) return;

    onSubmitAssessment({
      assignmentId,
      studentId,
      versionNumber,
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      evaluatorRole: currentUser.role === 'teacher' ? 'teacher' : currentUser.role === 'peer' ? 'peer' : 'student',
      criterionScores: selectedLevels,
      overallFeedback: overallFeedback.trim(),
      totalScore,
      maxScore
    });

    setSubmittedSuccess(true);
    setTimeout(() => setSubmittedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Summary & Multi-Evaluator Comparisons */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-50 text-sky-800 text-xs font-medium border border-sky-200 mb-1.5">
              <Award className="w-3.5 h-3.5" />
              Đánh giá theo ma trận rubric
            </div>
            <h2 className="text-base font-bold text-slate-900">{rubric.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đánh giá cho phiên bản: <span className="font-semibold text-slate-800">{versionNumber}</span> • Thang điểm chuẩn 4 mức độ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white rounded-lg px-4 py-2.5 text-center">
              <div className="text-xs text-slate-300 font-medium">Tổng điểm rubric</div>
              <div className="text-xl font-bold text-sky-400">
                {totalScore} <span className="text-xs font-normal text-slate-400">/ {maxScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Perspectives Comparison Badges (Self, Peer, Teacher) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`p-2.5 rounded-md border ${selfSub ? 'bg-sky-50/70 border-sky-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Tự đánh giá</span>
              <span className="font-bold text-slate-900">{selfSub ? `${selfSub.totalScore}/${selfSub.maxScore}` : 'Chưa nộp'}</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-md border ${peerSub ? 'bg-primary-50/70 border-primary-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Bạn học chấm</span>
              <span className="font-bold text-slate-900">{peerSub ? `${peerSub.totalScore}/${peerSub.maxScore}` : 'Chưa nộp'}</span>
            </div>
          </div>

          <div className={`p-2.5 rounded-md border ${teacherSub ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Giáo viên chấm</span>
              <span className="font-bold text-emerald-800">{teacherSub ? `${teacherSub.totalScore}/${teacherSub.maxScore}` : 'Chưa nộp'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {rubric.criteria.map((crit, cIdx) => {
          const selected = selectedLevels[crit.id] || { level: 2, score: 2.0, note: '' };
          const axisObj = POETIC_AXES.find(a => a.id === crit.axisId);

          return (
            <div key={crit.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-slate-200 text-slate-800 text-xs font-semibold flex items-center justify-center">
                      {cIdx + 1}
                    </span>
                    <h3 className="font-semibold text-slate-900 text-xs">{crit.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 ml-7">{axisObj?.description}</p>
                </div>

                <div className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-md">
                  Điểm: {selected.score} / 4.0
                </div>
              </div>

              {/* 4 Levels Options */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                {crit.levels.map(lvl => {
                  const isChosen = selected.level === lvl.level;
                  const levelColors = {
                    1: isChosen ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200 text-rose-950' : 'hover:border-rose-300',
                    2: isChosen ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200 text-amber-950' : 'hover:border-amber-300',
                    3: isChosen ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200 text-sky-950' : 'hover:border-sky-300',
                    4: isChosen ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 text-emerald-950' : 'hover:border-emerald-300',
                  };

                  return (
                    <button
                      type="button"
                      key={lvl.level}
                      onClick={() => handleSelectLevel(crit.id, lvl.level, lvl.score)}
                      disabled={isReadOnly}
                      aria-pressed={isChosen}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between disabled:cursor-default ${levelColors[lvl.level] || 'bg-white border-slate-200'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                          <span className="font-bold text-xs">
                            Mức {lvl.level}: {lvl.label}
                          </span>
                          <span className="font-bold text-xs text-slate-700">
                            {lvl.score.toFixed(1)} đ
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {lvl.description}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/40 space-y-1">
                          <span className="text-xs font-semibold text-slate-600 block">Chỉ báo quan sát:</span>
                          {lvl.observableIndicators.map((ind, i) => (
                            <div key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-slate-400">•</span> {ind}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 text-right">
                        {isChosen ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã chọn
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 hover:text-slate-700">
                            Chọn mức này
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Criterion Note */}
              <div className="px-4 pb-4">
                <input
                  type="text"
                  value={selected.note}
                  disabled={isReadOnly}
                  onChange={e => handleNoteChange(crit.id, e.target.value)}
                  placeholder="Ghi chú minh chứng cụ thể cho tiêu chí này (tùy chọn)..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          );
        })}

        {/* Overall Assessment Comment & Submit Action */}
        {!isReadOnly && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-600" />
              Nhận xét tổng thể & Định hướng sư phạm
            </h3>

            <textarea
              rows={4}
              value={overallFeedback}
              onChange={e => setOverallFeedback(e.target.value)}
              placeholder="Nhận xét tổng quát về mức độ tiến bộ, điểm sáng và định hướng hoàn thiện ở phiên bản tiếp theo..."
              className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:border-sky-500 focus:outline-none"
              required
            />

            <div className="flex items-center justify-between pt-2">
              <div>
                {submittedSuccess && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Đã lưu kết quả đánh giá Rubric thành công!
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all"
              >
                <Award className="w-4 h-4" />
                Lưu & Đăng Bảng Đánh Giá Rubric ({currentUser.role === 'teacher' ? 'Giáo viên' : currentUser.role === 'peer' ? 'Bạn học' : 'Tự đánh giá'})
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
