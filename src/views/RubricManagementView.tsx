import React, { useEffect, useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useAuthStore } from '../app/store/useAuthStore';
import type { RubricCriterion } from '../types';
import { Alert, Badge, Button, Input } from '../components/ui';
import { ArrowLeftIcon, BookmarkSquareIcon, CheckIcon } from '@heroicons/react/24/outline';

interface RubricManagementViewProps {
  onNavigate: (view: string, extraParams?: unknown) => void;
}

async function saveCatalog(payload: unknown) {
  const r = await fetch('/api/academic/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.code || 'Không thể lưu bảng tiêu chí chấm điểm');
  return d;
}

export const RubricManagementView: React.FC<RubricManagementViewProps> = ({ onNavigate }) => {
  const { rubric, refreshAcademicData } = usePortfolio();
  const currentUser = useAuthStore(state => state.currentUser);
  const canEdit = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const [title, setTitle] = useState(rubric.title);
  const [description, setDescription] = useState('Bảng tiêu chí chấm điểm 4 mức đánh giá năng lực đọc hiểu theo 6 phần.');
  const [criteria, setCriteria] = useState<RubricCriterion[]>(rubric.criteria);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setTitle(rubric.title);
    setCriteria(rubric.criteria);
  }, [rubric]);

  const updateDescription = (criterionIndex: number, levelIndex: number, value: string) => {
    setCriteria(prev =>
      prev.map((c, i) =>
        i !== criterionIndex
          ? c
          : {
              ...c,
              levels: c.levels.map((l, j) => (j !== levelIndex ? l : { ...l, description: value }))
            }
      )
    );
  };

  const saveVersion = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const d = await saveCatalog({ action: 'create_rubric_version', title, description, criteria });
      setMessage({
        type: 'success',
        text: `Đã tạo phiên bản bảng tiêu chí chấm điểm mới (${d.id}). Các bài đã chấm trước đó vẫn giữ nguyên tiêu chí cũ.`
      });
      await refreshAcademicData();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Không thể lưu bảng tiêu chí chấm điểm' });
    } finally {
      setSaving(false);
    }
  };

  const simulatedTotal = criteria.reduce((sum, c) => {
    const lvl = previewScores[c.id] || 3;
    const item = c.levels.find(l => l.level === lvl);
    return sum + (item?.score || lvl) * (c.weight || 1);
  }, 0);

  const simulatedMax = criteria.reduce((sum, c) => {
    const maxLvl = c.levels.reduce((m, l) => Math.max(m, l.score || l.level), 0);
    return sum + maxLvl * (c.weight || 1);
  }, 0);

  return (
    <div className="max-w-6xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('teacher-dashboard')}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Quay lại bàn giáo viên
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bảng tiêu chí chấm điểm</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tiêu chí chấm theo 6 phần, gồm 4 mức.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">Mã phiên bản: {rubric.id}</Badge>
        </div>
      </div>

      {message && (
        <Alert type={message.type} title={message.type === 'success' ? 'Thành công' : 'Lỗi'}>
          {message.text}
        </Alert>
      )}

      {/* Meta configuration */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Tên bảng tiêu chí chấm điểm"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={!canEdit}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả mục đích ma trận</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs leading-relaxed text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* Simulator Preview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <BookmarkSquareIcon className="h-4 w-4 text-primary-700" />
          <span className="font-semibold text-slate-800">Xem thử cách tính điểm:</span>
          <span className="text-slate-500">6 tiêu chí × 4 mức điểm</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-500">Điểm giả định:</span>
          <strong className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">
            {simulatedTotal}/{simulatedMax}đ ({Math.round((simulatedTotal / simulatedMax) * 100)}%)
          </strong>
        </div>
      </div>

      {/* Matrix Criteria Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
        <div className="flex items-center justify-between bg-slate-50/80 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Các mức đánh giá</h2>
            <p className="mt-0.5 text-xs text-slate-500">Mỗi tiêu chí có 4 mức đánh giá.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">6 phần phân tích</span>
        </div>

        {criteria.map((criterion, ci) => (
          <div key={criterion.id} className="p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">Trục {ci + 1}:</span>
                <h3 className="text-sm font-bold text-slate-900">{criterion.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" variant="outline">Trọng số: {criterion.weight}</Badge>
                {/* Level preview selector */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 mr-1">Thử mức:</span>
                  {[1, 2, 3, 4].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPreviewScores(p => ({ ...p, [criterion.id]: lvl }))}
                      className={`h-6 w-6 rounded text-xs font-bold transition ${
                        (previewScores[criterion.id] || 3) === lvl
                          ? 'bg-primary-700 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {criterion.levels.map((level, li) => {
                const isTested = (previewScores[criterion.id] || 3) === level.level;
                return (
                  <div
                    key={level.level}
                    className={`space-y-1.5 rounded-lg border p-3 transition ${
                      isTested ? 'border-primary-300 bg-primary-50/40' : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        Mức {level.level}: {level.label}
                      </span>
                      <Badge size="sm" variant={isTested ? 'primary' : 'outline'}>
                        {level.score}đ
                      </Badge>
                    </div>
                    <textarea
                      value={level.description}
                      onChange={e => updateDescription(ci, li, e.target.value)}
                      disabled={!canEdit}
                      rows={4}
                      className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-500">
          * Bài đã chấm bằng bảng tiêu chí chấm điểm cũ vẫn giữ nguyên kết quả.
        </p>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={saveVersion}
            isLoading={saving}
            disabled={!criteria.length || !title.trim()}
            leftIcon={<CheckIcon className="h-4 w-4" />}
          >
            Lưu phiên bản bảng tiêu chí chấm điểm mới
          </Button>
        )}
      </div>
    </div>
  );
};

