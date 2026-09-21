import React, { useState } from 'react';
import type { PortfolioVersion, PoeticAxisId } from '../../types';
import { POETIC_AXES } from '../../data/seedData';
import { computeAxisDiff, type AxisDiffResult } from '../../utils/diffEngine';
import { GitCompare, PlusCircle, MinusCircle, CheckCircle2, Split, AlignLeft } from 'lucide-react';

interface DiffViewerProps {
  v1: PortfolioVersion;
  v2: PortfolioVersion;
  studentName?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ v1, v2, studentName }) => {
  const [selectedAxisId, setSelectedAxisId] = useState<PoeticAxisId | 'all'>('all');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  // Compute diffs across all 6 axes
  const diffResults: Record<PoeticAxisId, AxisDiffResult> = {} as any;
  let totalAdded = 0;
  let totalRemoved = 0;

  POETIC_AXES.forEach(axis => {
    const textV1 = v1.responses[axis.id]?.analysisText || '';
    const textV2 = v2.responses[axis.id]?.analysisText || '';
    const res = computeAxisDiff(axis.id, textV1, textV2);
    diffResults[axis.id] = res;
    totalAdded += res.wordsAdded;
    totalRemoved += res.wordsRemoved;
  });

  const axesToRender = selectedAxisId === 'all' 
    ? POETIC_AXES 
    : POETIC_AXES.filter(a => a.id === selectedAxisId);

  return (
    <div className="space-y-6">
      {/* Header Comparison Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200 mb-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              So sánh chỉnh sửa phiên bản
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              So sánh: <span className="text-amber-700 font-bold">{v1.versionNumber}</span> ➔ <span className="text-emerald-700 font-bold">{v2.versionNumber}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Học sinh: <strong className="text-slate-900">{studentName || v2.authorName}</strong> • Phiên bản sau: {v2.authorName} ({new Date(v2.createdAt).toLocaleDateString('vi-VN')})
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 text-center">
              <div className="text-xs text-emerald-800 font-medium flex items-center justify-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Thêm mới
              </div>
              <div className="text-sm font-bold text-emerald-900">+{totalAdded} từ</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5 text-center">
              <div className="text-xs text-rose-800 font-medium flex items-center justify-center gap-1">
                <MinusCircle className="w-3.5 h-3.5" /> Cắt giảm
              </div>
              <div className="text-sm font-bold text-rose-900">-{totalRemoved} từ</div>
            </div>
          </div>
        </div>

        {/* Change summary of v2 */}
        {v2.changeSummary && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Ghi chú sửa đổi ở {v2.versionNumber}:</span>
              <span className="italic ml-1">"{v2.changeSummary}"</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Axis Filter & View Mode Toggle */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedAxisId('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              selectedAxisId === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả 6 trục
          </button>
          {POETIC_AXES.map(axis => (
            <button
              type="button"
              key={axis.id}
              onClick={() => setSelectedAxisId(axis.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                selectedAxisId === axis.id
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {axis.shortName}
              <span className="ml-1 text-xs opacity-75">
                (+{diffResults[axis.id]?.wordsAdded})
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'side-by-side' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Song song
          </button>
          <button
            type="button"
            onClick={() => setViewMode('unified')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'unified' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Gộp thay đổi
          </button>
        </div>
      </div>

      {/* Main Diff Content per Axis */}
      <div className="space-y-6">
        {axesToRender.map(axis => {
          const diff = diffResults[axis.id];
          const hasChanges = diff.wordsAdded > 0 || diff.wordsRemoved > 0;

          return (
            <div key={axis.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-sky-100 text-sky-800 font-semibold text-xs flex items-center justify-center">
                    {axis.order}
                  </span>
                  <h3 className="font-semibold text-slate-900 text-xs">{axis.title}</h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {hasChanges ? (
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Thay đổi {diff.changeRatePercent}% (+{diff.wordsAdded} / -{diff.wordsRemoved} từ)
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Không có thay đổi giữa 2 bản</span>
                  )}
                </div>
              </div>

              <div className="p-5">
                {viewMode === 'side-by-side' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Old Version */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 text-xs font-bold text-slate-600">
                        <span>Bản gốc: {v1.versionNumber}</span>
                        <span className="text-slate-400 font-normal">{new Date(v1.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="lit-content text-slate-700 text-sm whitespace-pre-wrap">
                        {diff.v1Text || <span className="italic text-slate-400">Chưa có nội dung ở phiên bản này</span>}
                      </div>
                    </div>

                    {/* Right: New Version */}
                    <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/20">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-200 text-xs font-bold text-emerald-800">
                        <span>Bản mới: {v2.versionNumber}</span>
                        <span className="text-emerald-600 font-normal">{new Date(v2.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="lit-content text-slate-800 text-sm whitespace-pre-wrap">
                        {diff.diffSegments.map((seg, idx) => {
                          if (seg.type === 'added') {
                            return <span key={idx} className="diff-added">{seg.value}</span>;
                          }
                          if (seg.type === 'removed') {
                            return null; // Side by side: right side only displays additions and unchanged
                          }
                          return <span key={idx}>{seg.value}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Unified Inline Diff */
                  <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/30">
                    <div className="lit-content text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                      {diff.diffSegments.map((seg, idx) => {
                        if (seg.type === 'added') {
                          return (
                            <span key={idx} className="diff-added font-medium">
                              {seg.value}
                            </span>
                          );
                        }
                        if (seg.type === 'removed') {
                          return (
                            <span key={idx} className="diff-removed">
                              {seg.value}
                            </span>
                          );
                        }
                        return <span key={idx}>{seg.value}</span>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
