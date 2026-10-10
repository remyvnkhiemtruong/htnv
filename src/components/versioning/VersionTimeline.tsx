import React from 'react';
import type { PortfolioVersion } from '../../types';
import { History, CheckCircle2, Lock, GitCommit, ArrowRight, Eye } from 'lucide-react';

interface VersionTimelineProps {
  versions: PortfolioVersion[];
  activeVersionNumber: string;
  onSelectVersion: (verNumber: string) => void;
  onOpenDiff: (v1: string, v2: string) => void;
  onOpenNewSnapshotModal: () => void;
  canCreateSnapshot?: boolean;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  activeVersionNumber,
  onSelectVersion,
  onOpenDiff,
  onOpenNewSnapshotModal,
  canCreateSnapshot = true
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-600" />
          <h3 className="font-semibold text-slate-900 text-xs">Lịch sử phiên bản</h3>
        </div>
        {canCreateSnapshot && (
          <button
            type="button"
            onClick={onOpenNewSnapshotModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-xs font-medium transition-colors"
          >
            <GitCommit className="w-3.5 h-3.5" />
            Tạo phiên bản mới
          </button>
        )}
      </div>

      {versions.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Chưa lưu phiên bản nào. Viết bản nháp rồi chọn "Tạo phiên bản mới".
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {versions.map((ver, idx) => {
            const isSelected = activeVersionNumber === ver.versionNumber;
            const prevVer = idx > 0 ? versions[idx - 1] : null;

            return (
              <div key={ver.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-sky-600 border-sky-200 ring-2 ring-sky-300'
                      : 'bg-white border-slate-400 group-hover:border-sky-500'
                  }`}
                />

                <div
                  className={`p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-300 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{ver.versionNumber}</span>
                      {ver.isFrozen && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" /> Đóng băng
                        </span>
                      )}
                      {ver.isSubmitted && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Đã nộp
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(ver.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 italic">
                    "{ver.changeSummary || 'Không có ghi chú thay đổi'}"
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onSelectVersion(ver.versionNumber)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isSelected ? 'text-sky-700' : 'text-slate-600 hover:text-sky-600'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isSelected ? 'Đang xem' : 'Xem phiên bản này'}
                    </button>

                    {prevVer && (
                      <button
                        type="button"
                        onClick={() => onOpenDiff(prevVer.versionNumber, ver.versionNumber)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-0.5 rounded transition-colors"
                      >
                        So sánh Diff ({prevVer.versionNumber} <ArrowRight className="w-3 h-3" /> {ver.versionNumber})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
