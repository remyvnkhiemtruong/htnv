import React, { useState } from 'react';
import type { PoeticAxisId } from '../../types';
import { POETIC_AXES } from '../../data/seedData';
import { MessageSquarePlus, CheckCheck, User, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface AnchoredFeedbackPanelProps {
  assignmentId: string;
  studentId: string;
  versionNumber: string;
  selectedAxisId?: PoeticAxisId;
  canAddFeedback?: boolean;
}

export const AnchoredFeedbackPanel: React.FC<AnchoredFeedbackPanelProps> = ({
  assignmentId,
  studentId,
  versionNumber,
  selectedAxisId,
  canAddFeedback = true
}) => {
  const { currentUser } = useAuth();
  const { feedbacks, addAnchoredFeedback, resolveFeedback } = usePortfolio();

  const [newComment, setNewComment] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState('');
  const [targetAxisId, setTargetAxisId] = useState<PoeticAxisId>(selectedAxisId || 'plot_situation');
  const [isAdding, setIsAdding] = useState(false);

  // Filter feedbacks for this student, assignment and version
  const relevantFeedbacks = feedbacks.filter(
    f => f.assignmentId === assignmentId && f.studentId === studentId && f.versionNumber === versionNumber
  );

  const handleCreateFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addAnchoredFeedback({
      assignmentId,
      studentId,
      versionNumber,
      axisId: targetAxisId,
      selectedSnippet: selectedSnippet.trim() || 'Nhận xét chung cho trục thi pháp này',
      comment: newComment.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role === 'teacher' ? 'teacher' : 'peer'
    });

    setNewComment('');
    setSelectedSnippet('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary-50 text-primary-700 flex items-center justify-center">
            <MessageSquarePlus className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-xs">Phản hồi neo ngữ cảnh</h3>
            <p className="text-xs text-slate-500">Gắn vào văn bản thuộc phiên bản <strong>{versionNumber}</strong></p>
          </div>
        </div>

        {canAddFeedback && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-medium transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Thêm nhận xét neo
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Form add new comment */}
        {isAdding && (
          <form onSubmit={handleCreateFeedback} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-3">
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <MessageSquarePlus className="w-3.5 h-3.5 text-primary-600" />
              Tạo phản hồi cho phiên bản {versionNumber}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thuộc trục thi pháp:
              </label>
              <select
                value={targetAxisId}
                onChange={e => setTargetAxisId(e.target.value as PoeticAxisId)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 focus:border-primary-500 focus:outline-none"
              >
                {POETIC_AXES.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đoạn văn bản trích dẫn neo (hoặc để trống nếu nhận xét tổng quát):
              </label>
              <input
                type="text"
                value={selectedSnippet}
                onChange={e => setSelectedSnippet(e.target.value)}
                placeholder="Dán hoặc nhập cụm từ / câu văn cần góp ý..."
                className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung nhận xét & Gợi ý hướng sửa:
              </label>
              <textarea
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ví dụ: Chỗ này em cần bổ sung thêm dẫn chứng về lời nửa trực tiếp..."
                className="w-full text-xs bg-white border border-slate-300 rounded-md p-2.5 focus:border-primary-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200/60 rounded-md font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-md"
              >
                Lưu phản hồi neo
              </button>
            </div>
          </form>
        )}

        {/* Feedback List */}
        {relevantFeedbacks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Chưa có phản hồi nào được neo vào phiên bản {versionNumber}.
          </div>
        ) : (
          <div className="space-y-2.5">
            {relevantFeedbacks.map(item => {
              const axisObj = POETIC_AXES.find(a => a.id === item.axisId);
              const isTeacher = item.authorRole === 'teacher';

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all ${
                    item.resolved
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : isTeacher
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded ${
                          isTeacher
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-primary-50 text-primary-800 border border-primary-200'
                        }`}
                      >
                        {isTeacher ? <User className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                        {item.authorName} ({isTeacher ? 'Giáo viên' : 'Bạn học'})
                      </span>
                      <span className="text-xs text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {axisObj?.shortName || item.axisId}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Highlight snippet quote */}
                  {item.selectedSnippet && (
                    <div className="mt-2 text-xs bg-white p-2 rounded-md border-l-2 border-amber-400 text-slate-700 italic">
                      <span className="font-semibold text-amber-700 not-italic text-xs block">Văn bản được neo:</span>
                      "{item.selectedSnippet}"
                    </div>
                  )}

                  {/* Feedback text */}
                  <p className="mt-1.5 text-xs text-slate-800 leading-relaxed font-normal">
                    {item.comment}
                  </p>

                  {/* Resolution action */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    {item.resolved ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <CheckCheck className="w-3.5 h-3.5" /> Đã tiếp thu & sửa ở bản mới
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resolveFeedback(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 px-2 py-1 rounded border border-slate-200 hover:border-emerald-300 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Đánh dấu đã tiếp thu
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
