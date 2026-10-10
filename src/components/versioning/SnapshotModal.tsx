import React, { useEffect, useState } from 'react';
import { GitCommit, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedVersion: string;
  onCommitSnapshot: (versionNumber: string, changeSummary: string) => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  nextSuggestedVersion,
  onCommitSnapshot
}) => {
  const [versionNumber, setVersionNumber] = useState(nextSuggestedVersion);
  const [changeSummary, setChangeSummary] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setVersionNumber(nextSuggestedVersion);
    setChangeSummary('');
    setError('');
  }, [isOpen, nextSuggestedVersion]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionNumber.trim()) {
      setError('Nhập ký hiệu phiên bản, ví dụ v1.0 hoặc v2.0.');
      return;
    }
    if (!changeSummary.trim() || changeSummary.trim().length < 8) {
      setError('Ghi nội dung đã sửa và lý do, ít nhất 8 ký tự.');
      return;
    }

    onCommitSnapshot(versionNumber.trim(), changeSummary.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="lg" title={<span className="flex items-center gap-2"><GitCommit className="h-4 w-4 text-sky-600" />Tạo phiên bản mới</span>}>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              Lưu bản nháp của 6 trục thành một phiên bản riêng để so sánh và nhận xét.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ký hiệu phiên bản
            </label>
            <input
              type="text"
              value={versionNumber}
              onChange={e => {
                setVersionNumber(e.target.value);
                setError('');
              }}
              placeholder="v1.0 hoặc v2.0"
              className="w-full text-xs font-medium border border-slate-300 rounded-md px-2.5 py-1.5 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú nội dung chỉnh sửa <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={changeSummary}
              onChange={e => {
                setChangeSummary(e.target.value);
                setError('');
              }}
              placeholder="Ví dụ: Thêm dẫn chứng về bát cháo cám theo góp ý của giáo viên."
              className="w-full text-xs font-normal border border-slate-300 rounded-md p-2.5 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-md border border-rose-200">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors"
            >
              <GitCommit className="w-3.5 h-3.5" />
              Lưu phiên bản
            </button>
          </div>
        </form>
    </Modal>
  );
};
