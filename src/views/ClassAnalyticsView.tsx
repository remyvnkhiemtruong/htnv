import React, { useMemo, useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import type { PoeticAxisId } from '../types';
import { assessmentPercentage } from '../utils/assessmentAnalytics';
import { Badge, Button } from '../components/ui';
import { ArrowLeftIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface ClassAnalyticsViewProps {
  onNavigate: (view: string, extraParams?: unknown) => void;
}

const axisLabels: Record<PoeticAxisId, string> = {
  plot_situation: 'Tình huống',
  character_detail: 'Nhân vật',
  narrator_pov: 'Điểm nhìn',
  space_time: 'Không gian',
  language_tone_symbol: 'Ngôn ngữ',
  form_argument: 'Lập luận'
};

const AXES = Object.keys(axisLabels) as PoeticAxisId[];

export const ClassAnalyticsView: React.FC<ClassAnalyticsViewProps> = ({ onNavigate }) => {
  const { portfolios, rubricSubmissions, rubrics, assignments } = usePortfolio();
  const list = useMemo(() => Object.values(portfolios), [portfolios]);
  const classes = useMemo(() => Array.from(new Set(list.map(item => item.className).filter(Boolean))).sort(), [list]);
  const [classFilter, setClassFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [selectedAxisFilter, setSelectedAxisFilter] = useState<PoeticAxisId | null>(null);

  const filtered = useMemo(() => list.filter(portfolio => {
    if (classFilter !== 'all' && portfolio.className !== classFilter) return false;
    if (assignmentFilter !== 'all' && portfolio.assignmentId !== assignmentFilter) return false;
    return true;
  }), [list, classFilter, assignmentFilter]);

  const rows = useMemo(() => filtered.map(portfolio => {
    const assignment = assignments.find(item => item.id === portfolio.assignmentId);
    const assignmentRubric = assignment ? rubrics[assignment.rubricId] : undefined;
    const criterionMeta = assignmentRubric ? Object.fromEntries(assignmentRubric.criteria.map(criterion => {
      const max = criterion.levels.reduce((value, level) => Math.max(value, Number(level.score ?? level.level ?? 0)), 0);
      return [criterion.id, { axisId: criterion.axisId, max }];
    })) : {};
    const teacherSubmission = rubricSubmissions
      .filter(item => item.studentId === portfolio.studentId && item.assignmentId === portfolio.assignmentId && item.evaluatorRole === 'teacher')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
    const scores: Partial<Record<PoeticAxisId, number>> = {};
    if (teacherSubmission && assignmentRubric) {
      Object.entries(teacherSubmission.criterionScores).forEach(([criterionId, value]) => {
        const meta = criterionMeta[criterionId] as { axisId: PoeticAxisId; max: number } | undefined;
        if (!meta || meta.max <= 0) return;
        const raw = Number(value.score ?? value.level ?? 0);
        if (Number.isFinite(raw)) scores[meta.axisId] = Math.max(0, Math.min(100, (raw / meta.max) * 100));
      });
    }
    return {
      portfolio,
      submission: teacherSubmission,
      rubricMissing: Boolean(assignment && !assignmentRubric),
      scores,
      average: assignmentRubric ? assessmentPercentage(teacherSubmission) : null
    };
  }), [filtered, assignments, rubrics, rubricSubmissions]);

  const studentAggregates = useMemo(() => {
    const map = new Map<string, { studentId: string; axes: Partial<Record<PoeticAxisId, number[]>>; averages: number[] }>();
    for (const row of rows) {
      if (!map.has(row.portfolio.studentId)) map.set(row.portfolio.studentId, { studentId: row.portfolio.studentId, axes: {}, averages: [] });
      const target = map.get(row.portfolio.studentId)!;
      if (typeof row.average === 'number') target.averages.push(row.average);
      for (const axis of AXES) {
        const value = row.scores[axis];
        if (typeof value === 'number') {
          if (!target.axes[axis]) target.axes[axis] = [];
          target.axes[axis]!.push(value);
        }
      }
    }
    return [...map.values()];
  }, [rows]);

  const axisStats = useMemo(() => Object.fromEntries(AXES.map(axis => {
    const perStudent = studentAggregates.map(student => {
      const values = (student.axes[axis] || []).filter(v => typeof v === 'number' && Number.isFinite(v));
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    }).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return [axis, { n: perStudent.length, average: perStudent.length ? perStudent.reduce((sum, value) => sum + value, 0) / perStudent.length : null }];
  })), [studentAggregates]);

  const weakAxis = AXES
    .filter(axis => (axisStats[axis]?.n || 0) > 0 && typeof axisStats[axis]?.average === 'number' && Number.isFinite(axisStats[axis]?.average))
    .sort((a, b) => Number(axisStats[a]?.average) - Number(axisStats[b]?.average))[0];
  const strongAxis = AXES
    .filter(axis => (axisStats[axis]?.n || 0) > 0 && typeof axisStats[axis]?.average === 'number' && Number.isFinite(axisStats[axis]?.average))
    .sort((a, b) => Number(axisStats[b]?.average) - Number(axisStats[a]?.average))[0];

  const perStudentOverall = studentAggregates.map(student => {
    const validAverages = student.averages.filter(v => typeof v === 'number' && Number.isFinite(v));
    return validAverages.length
      ? validAverages.reduce((sum, value) => sum + value, 0) / validAverages.length
      : null;
  }).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const overall = perStudentOverall.length ? perStudentOverall.reduce((sum, value) => sum + value, 0) / perStudentOverall.length : null;
  const submittedStudents = new Set(filtered.filter(portfolio => portfolio.versions.some(version => version.stage !== 'prediction')).map(portfolio => portfolio.studentId)).size;
  const uniqueStudents = new Set(filtered.map(portfolio => portfolio.studentId)).size;
  const missingRubricCount = rows.filter(row => row.rubricMissing).length;

  const displayedRows = useMemo(() => {
    if (!selectedAxisFilter) return rows;
    return [...rows].sort((a, b) => {
      const aVal = typeof a.scores[selectedAxisFilter] === 'number' ? a.scores[selectedAxisFilter]! : -1;
      const bVal = typeof b.scores[selectedAxisFilter] === 'number' ? b.scores[selectedAxisFilter]! : -1;
      return aVal - bVal;
    });
  }, [rows, selectedAxisFilter]);

  return (
    <div className="max-w-7xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <div className="mb-1">
            <Button size="sm" variant="ghost" onClick={() => onNavigate('teacher-dashboard')} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Quay lại bàn giáo viên
            </Button>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Phân tích kết quả lớp</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Chỉ dùng điểm bảng tiêu chí chấm điểm do giáo viên chấm. Mỗi học sinh được tính một lần.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={classFilter}
            onChange={event => setClassFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
          >
            <option value="all">Tất cả lớp học</option>
            {classes.map(className => <option key={className} value={className}>Lớp {className}</option>)}
          </select>

          <select
            value={assignmentFilter}
            onChange={event => setAssignmentFilter(event.target.value)}
            className="max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
          >
            <option value="all">Tất cả nhiệm vụ</option>
            {assignments.map(assignment => <option key={assignment.id} value={assignment.id}>{assignment.title}</option>)}
          </select>
        </div>
      </div>

      {missingRubricCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          Có {missingRubricCount} hồ sơ thiếu bảng tiêu chí chấm điểm của nhiệm vụ nên chưa được tính.
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Học sinh</span>
            <UserGroupIcon className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{uniqueStudents}</div>
          <div className="mt-1 text-xs text-slate-500">học sinh trong bộ lọc</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tiến độ nộp bài</span>
            <AcademicCapIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{submittedStudents}</div>
          <div className="mt-1 text-xs text-slate-500">học sinh đã nộp bài phân tích</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm trung bình lớp</span>
            <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {typeof overall === 'number' ? `${overall.toFixed(1)}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">{perStudentOverall.length} học sinh đã có điểm</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phần phân tích yếu nhất</span>
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-base font-bold text-amber-900 truncate">
            {weakAxis ? axisLabels[weakAxis] : 'Chưa có'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {weakAxis && typeof axisStats[weakAxis]?.average === 'number'
              ? `${Number(axisStats[weakAxis].average).toFixed(1)}% (n=${axisStats[weakAxis].n})`
              : 'Cần thêm dữ liệu chấm'}
          </div>
        </div>
      </div>

      {/* Axis Performance Visualization Bars */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Kết quả theo 6 phần</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Nhấp vào một trục để sắp xếp học sinh cần hỗ trợ lên đầu bảng
            </p>
          </div>
          {selectedAxisFilter && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedAxisFilter(null)}>
              Hủy lọc theo trục ({axisLabels[selectedAxisFilter]})
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AXES.map(axis => {
            const stat = axisStats[axis];
            const avg = typeof stat?.average === 'number' ? stat.average : null;
            const isSelected = selectedAxisFilter === axis;
            const isWeakest = axis === weakAxis;
            const isStrongest = axis === strongAxis;

            return (
              <button
                key={axis}
                type="button"
                onClick={() => setSelectedAxisFilter(isSelected ? null : axis)}
                className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-primary-600 bg-primary-50/60 ring-1 ring-primary-600'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{axisLabels[axis]}</span>
                  {isWeakest && <Badge size="sm" variant="amber">Cần chú ý</Badge>}
                  {isStrongest && <Badge size="sm" variant="emerald">Thế mạnh</Badge>}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-mono font-bold text-slate-900">
                      {avg !== null ? `${avg.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-slate-400">n = {stat?.n || 0}</span>
                  </div>

                  {/* Visual Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        avg === null ? 'w-0' : avg >= 75 ? 'bg-emerald-600' : avg >= 50 ? 'bg-primary-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${avg || 0}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Criteria Breakdown Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/70 p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Điểm từng học sinh</h2>
            <p className="mt-0.5 text-xs text-slate-500">“—” là chưa chấm hoặc thiếu bảng tiêu chí chấm điểm</p>
          </div>
          {selectedAxisFilter && (
            <span className="text-xs font-semibold text-primary-900 bg-primary-50 px-2.5 py-1 rounded border border-primary-200">
              Đang sắp xếp theo: {axisLabels[selectedAxisFilter]} (thấp → cao)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-3 py-3">Lớp</th>
                <th className="px-3 py-3">Nhiệm vụ</th>
                {AXES.map(axis => (
                  <th
                    key={axis}
                    aria-sort={selectedAxisFilter === axis ? 'ascending' : 'none'}
                    className={`px-2 py-3 text-center transition ${
                      selectedAxisFilter === axis ? 'bg-primary-50 text-primary-900 font-bold' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full rounded px-1 py-1 font-semibold hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => setSelectedAxisFilter(selectedAxisFilter === axis ? null : axis)}
                    >
                      {axisLabels[axis]}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-bold">Điểm TB</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={AXES.length + 5} className="py-8 text-center text-xs text-slate-500">
                    Không có hồ sơ phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                displayedRows.map(({ portfolio, scores, average, submission }) => (
                  <tr key={portfolio.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {portfolio.studentName}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{portfolio.className || '—'}</td>
                    <td className="px-3 py-3 text-slate-500 truncate max-w-[140px]">
                      {assignments.find(item => item.id === portfolio.assignmentId)?.title || '—'}
                    </td>
                    {AXES.map(axis => {
                      const score = scores[axis];
                      return (
                        <td
                          key={axis}
                          className={`px-2 py-3 text-center font-mono ${
                            selectedAxisFilter === axis ? 'bg-primary-50/50 font-bold' : ''
                          }`}
                        >
                          {typeof score === 'number' ? (
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 ${
                                score >= 75
                                  ? 'text-emerald-800 bg-emerald-50'
                                  : score >= 50
                                  ? 'text-slate-800'
                                  : 'text-amber-800 bg-amber-50 font-bold'
                              }`}
                            >
                              {score.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-900">
                      {typeof average === 'number' ? `${average.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={submission ? 'ghost' : 'outline'}
                        onClick={() =>
                          onNavigate('teacher-review', {
                            assignmentId: portfolio.assignmentId,
                            studentId: portfolio.studentId
                          })
                        }
                      >
                        {submission ? 'Xem lại' : 'Chấm bài'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
