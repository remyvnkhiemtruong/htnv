import React, { useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import type { PoeticAxisId } from '../types';
import { assessmentPercentage, teacherAssessmentsByVersion } from '../utils/assessmentAnalytics';
import { Button } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ResearcherJudgeViewProps {
  onNavigate: (view: string, extraParams?: any) => void;
}

const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const sd = (values: number[]) => {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
};

export const ResearcherJudgeView: React.FC<ResearcherJudgeViewProps> = ({ onNavigate }) => {
  const { portfolios, rubricSubmissions, rubrics, assignments } = usePortfolio();

  const samples = useMemo(() => Object.values(portfolios).map(portfolio => {
    const assignment = assignments.find(item => item.id === portfolio.assignmentId);
    const assignmentRubric = assignment ? rubrics[assignment.rubricId] : undefined;
    const criterionMeta = assignmentRubric ? Object.fromEntries(assignmentRubric.criteria.map(criterion => {
      const max = criterion.levels.reduce((value, level) => Math.max(value, Number(level.score ?? level.level ?? 0)), 0);
      return [criterion.id, { axisId: criterion.axisId, max }];
    })) : {};

    const submissions = teacherAssessmentsByVersion(
      rubricSubmissions.filter(item => item.studentId === portfolio.studentId && item.assignmentId === portfolio.assignmentId),
      portfolio.versions
    );

    const pairedEligible = submissions.length >= 2;
    const pre = pairedEligible ? assessmentPercentage(submissions[0]) : null;
    const post = pairedEligible ? assessmentPercentage(submissions.at(-1)) : null;
    const latest = submissions.at(-1);
    const axes: Partial<Record<PoeticAxisId, number>> = {};
    if (latest && assignmentRubric) {
      Object.entries(latest.criterionScores).forEach(([criterionId, value]) => {
        const meta = criterionMeta[criterionId] as { axisId: PoeticAxisId; max: number } | undefined;
        if (!meta || meta.max <= 0) return;
        const raw = Number(value.score ?? value.level ?? 0);
        if (Number.isFinite(raw)) axes[meta.axisId] = Math.max(0, Math.min(100, (raw / meta.max) * 100));
      });
    }

    return {
      code: portfolio.studentId,
      cohort: portfolio.className || 'Nhóm nghiên cứu',
      assignmentCode: portfolio.assignmentId,
      pre,
      post,
      gain: typeof pre === 'number' && typeof post === 'number' ? post - pre : null,
      versionCount: portfolio.versions.length,
      axes,
      rubricAvailable: Boolean(assignmentRubric)
    };
  }), [portfolios, rubricSubmissions, rubrics, assignments]);

  const paired = samples.filter(sample => typeof sample.pre === 'number' && typeof sample.post === 'number' && typeof sample.gain === 'number');
  const gains = paired.map(sample => Number(sample.gain));
  const effect = gains.length > 1 && sd(gains) > 0 ? mean(gains) / sd(gains) : null;
  const avgPre = mean(paired.map(sample => Number(sample.pre)));
  const avgPost = mean(paired.map(sample => Number(sample.post)));
  const missingRubric = samples.filter(sample => !sample.rubricAvailable).length;

  return (
    <div className="max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1"><Button size="sm" variant="ghost" onClick={() => onNavigate('dashboard')} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>Tổng quan</Button></div>
          <h1 className="text-2xl font-semibold text-slate-900">Phân tích nghiên cứu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dữ liệu được ẩn danh trước khi hiển thị và chỉ dùng kết quả bảng tiêu chí chấm điểm của đúng nhiệm vụ.</p>
        </div>
        <div className="text-xs text-slate-500">{samples.length} hồ sơ mẫu</div>
      </div>

      {missingRubric > 0 && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{missingRubric} hồ sơ thiếu bảng tiêu chí chấm điểm của nhiệm vụ nên chưa được tính ở các tiêu chí tương ứng.</div>}

      <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span><strong>{samples.length}</strong> hồ sơ nghiên cứu</span><span className="text-slate-300">·</span>
        <span><strong>{paired.length}</strong> cặp đối chứng đủ điều kiện</span><span className="text-slate-300">·</span>
        <span>Trước TB: <strong>{paired.length ? `${avgPre.toFixed(1)}%` : '—'}</strong></span><span className="text-slate-300">·</span>
        <span>Sau TB: <strong>{paired.length ? `${avgPost.toFixed(1)}%` : '—'}</strong></span><span className="text-slate-300">·</span>
        <span>Cohen&apos;s d: <strong>{typeof effect === 'number' ? effect.toFixed(2) : '—'}</strong></span>
      </div>

      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-200"><h2 className="text-base font-semibold text-slate-900">Dữ liệu mẫu đối chứng</h2><p className="text-xs text-slate-500 mt-0.5">Không hiển thị tên, email, số điện thoại, mã lớp thật hoặc nội dung bài viết.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600"><tr><th className="py-3 px-4">Mã ẩn danh</th><th className="py-3 px-3 text-center">Nhóm ẩn danh</th><th className="py-3 px-3 text-center">Số bản</th><th className="py-3 px-3 text-center">Bản trước</th><th className="py-3 px-3 text-center">Bản sau</th><th className="py-3 px-3 text-center">Mức tăng</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {samples.length === 0 ? <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-500">Chưa có dữ liệu nghiên cứu khả dụng.</td></tr> : samples.map(sample => (
                <tr key={`${sample.code}-${sample.assignmentCode}`} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 text-xs font-mono text-slate-700">{sample.code}</td>
                  <td className="py-3 px-3 text-center text-xs text-slate-600">{sample.cohort}</td>
                  <td className="py-3 px-3 text-center text-xs text-slate-700">{sample.versionCount}</td>
                  <td className="py-3 px-3 text-center text-xs text-slate-700">{typeof sample.pre === 'number' ? `${sample.pre.toFixed(1)}%` : '—'}</td>
                  <td className="py-3 px-3 text-center text-xs font-medium text-slate-900">{typeof sample.post === 'number' ? `${sample.post.toFixed(1)}%` : '—'}</td>
                  <td className="py-3 px-3 text-center text-xs">{typeof sample.gain === 'number' ? <span className={sample.gain > 0 ? 'text-emerald-700 font-medium' : sample.gain < 0 ? 'text-rose-700' : 'text-slate-500'}>{sample.gain > 0 ? `+${sample.gain.toFixed(1)}` : sample.gain.toFixed(1)} điểm %</span> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
