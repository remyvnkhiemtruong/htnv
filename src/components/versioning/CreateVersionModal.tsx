import React, { useState } from 'react';
import { learningErrorText, learningVersionLabel } from '../../utils/learningLabels';
import { Button, Modal } from '../ui';
import type { FeedbackItem } from '../../types';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextVersionNumber: string;
  isInitial?: boolean;
  isPrediction?: boolean;
  feedbacks?: FeedbackItem[];
  onConfirm: (data: {
    changeSummary: string;
    revisionReason: string;
    linkedFeedbackIds: string[];
    changeSource: string;
    confidence: number;
    stage?: 'prediction' | 'initial' | 'revision';
  }) => Promise<void>;
}

export const CreateVersionModal: React.FC<CreateVersionModalProps> = ({
  isOpen,
  onClose,
  nextVersionNumber,
  isInitial = false,
  isPrediction = false,
  feedbacks = [],
  onConfirm
}) => {
  const [changeSummary, setChangeSummary] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [linkedFeedbackIds, setLinkedFeedbackIds] = useState<string[]>([]);
  const [changeSource, setChangeSource] = useState('self');
  const [confidence, setConfidence] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const effectiveInitial = !isPrediction && (isInitial || /^v?1(?:\.0)?$/i.test(nextVersionNumber));

  const toggleFeedback = (id: string) => {
    setLinkedFeedbackIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!effectiveInitial && !isPrediction && !changeSummary.trim()) {
      setErrorMsg('Vui lòng mô tả tóm tắt nội dung bạn đã sửa.');
      return;
    }
    if (!effectiveInitial && !isPrediction && !revisionReason.trim()) {
      setErrorMsg('Vui lòng giải thích lí do bạn thực hiện chỉnh sửa này.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const stage = isPrediction ? 'prediction' : (effectiveInitial ? 'initial' : 'revision');
      await onConfirm({
        changeSummary: changeSummary.trim() || (isPrediction ? 'Bản dự đoán trước đọc' : effectiveInitial ? 'Nộp bản đầu tiên' : 'Chỉnh sửa bài viết'),
        revisionReason: revisionReason.trim() || (effectiveInitial ? 'Bản đầu tiên' : isPrediction ? 'Dự đoán trước đọc' : 'Chỉnh sửa theo yêu cầu'),
        linkedFeedbackIds,
        changeSource: isPrediction ? 'initial_prediction' : effectiveInitial ? 'initial_response' : changeSource,
        confidence,
        stage
      });
      onClose();
    } catch (error) {
      setErrorMsg(learningErrorText(error, 'Chưa nộp được bài. Nội dung vẫn được giữ; em hãy thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isPrediction ? 'Nộp dự đoán trước khi đọc' : `Nộp ${learningVersionLabel(nextVersionNumber).toLocaleLowerCase('vi-VN')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={isPrediction
        ? 'Ghi dự đoán và căn cứ trước khi đọc. Em sẽ viết bài phân tích ở bước tiếp theo.'
        : effectiveInitial
          ? 'Bài đầu tiên sẽ được lưu để nhận góp ý.'
          : 'Ghi những điều em đã sửa và lý do sửa.'}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
          <Button variant="primary" isLoading={isSubmitting} onClick={handleSubmit}>
            {isPrediction ? 'Nộp dự đoán' : `Nộp ${learningVersionLabel(nextVersionNumber).toLocaleLowerCase('vi-VN')}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        {errorMsg && <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">{errorMsg}</div>}

        <div>
          <label className="block text-xs font-medium text-slate-800 mb-1">{effectiveInitial || isPrediction ? 'Ghi chú bài nộp:' : 'Tôi đã sửa gì? *'}</label>
          <textarea
            rows={3}
            value={changeSummary}
            onChange={e => setChangeSummary(e.target.value)}
            placeholder={effectiveInitial || isPrediction ? 'Ghi chú vắn tắt về bài viết...' : 'Ví dụ: Bổ sung dẫn chứng ở trục cốt truyện, diễn đạt lại luận điểm...'}
            className="w-full rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {!effectiveInitial && !isPrediction && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-800 mb-1">Vì sao em sửa? *</label>
              <textarea rows={2} value={revisionReason} onChange={e => setRevisionReason(e.target.value)} placeholder="Giải thích lí do (phát hiện thiếu dẫn chứng, theo góp ý của giáo viên...)" className="w-full rounded-md border border-slate-300 p-2.5 text-sm outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-800 mb-1">Nguồn thay đổi:</label>
              <select value={changeSource} onChange={e => setChangeSource(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 outline-none focus:border-slate-500">
                <option value="self">Tự phát hiện và chỉnh sửa</option>
                <option value="teacher_feedback">Theo phản hồi của giáo viên</option>
                <option value="peer_feedback">Theo góp ý của bạn học</option>
                <option value="mixed">Kết hợp tự sửa và phản hồi</option>
              </select>
            </div>
            {feedbacks.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-800 mb-1.5">Phản hồi đã sử dụng:</label>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border border-slate-200 bg-slate-50/50 p-2">
                  {feedbacks.map(f => (
                    <label key={f.id} className="flex items-start gap-2 cursor-pointer rounded p-1 hover:bg-white text-xs text-slate-700">
                      <input type="checkbox" checked={linkedFeedbackIds.includes(f.id)} onChange={() => toggleFeedback(f.id)} className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500" />
                      <div className="min-w-0 flex-1 truncate"><span className="font-medium">{f.authorRole === 'teacher' ? 'Giáo viên' : f.authorRole === 'ai' ? 'AI' : 'Bạn học'}:</span>{' '}<span>{f.comment}</span></div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-800 mb-2">Mức độ tự tin với bài nộp này:</label>
          <div className="flex items-center gap-4 text-sm text-slate-700">
            {[1, 2, 3, 4, 5].map(val => (
              <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="confidence-level" value={val} checked={confidence === val} onChange={() => setConfidence(val)} className="text-slate-900 focus:ring-slate-500" />
                <span>{val}</span>
              </label>
            ))}
            <span className="text-xs text-slate-500 ml-2">{confidence === 1 ? '(Chưa chắc chắn)' : confidence === 5 ? '(Rất tự tin)' : ''}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
