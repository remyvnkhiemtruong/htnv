import { learningVersionLabel } from '../utils/learningLabels';
import React, { useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useAuthStore } from '../app/store/useAuthStore';
import { useStudentOverviewQuery, useStudentWorkspaceQuery } from '../app/queries/studentAcademicQueries';
import { useTeacherWorkspaceQuery } from '../app/queries/teacherAcademicQueries';
import { academicVersionsOf } from '../app/workflow/workflowState';
import type { PoeticAxisId } from '../types';
import { Badge, Button } from '../components/ui';
import {
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

interface StudentAnalyticsViewProps {
  studentId: string;
  assignmentId: string;
  onNavigate: (view: string, extraParams?: unknown) => void;
}

const labels: Record<PoeticAxisId, string> = {
  plot_situation: 'Tình huống – Cốt truyện',
  character_detail: 'Nhân vật – Chi tiết',
  narrator_pov: 'Người kể – Điểm nhìn',
  space_time: 'Không gian – Thời gian',
  language_tone_symbol: 'Ngôn ngữ – Giọng điệu',
  form_argument: 'Tổng hợp & Lập luận'
};

export const StudentAnalyticsView: React.FC<StudentAnalyticsViewProps> = ({ studentId, assignmentId, onNavigate }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const compatibility = usePortfolio();
  const isStudent = currentUser.role === 'student';
  const isTeacher = currentUser.role === 'teacher';
  const overviewQuery = useStudentOverviewQuery(currentUser.id, isStudent && Boolean(currentUser.id) && !assignmentId);
  const workspaceQuery = useStudentWorkspaceQuery(currentUser.id, assignmentId, isStudent && Boolean(currentUser.id) && Boolean(assignmentId));
  const teacherWorkspaceQuery = useTeacherWorkspaceQuery(
    currentUser.id,
    assignmentId,
    studentId,
    isTeacher && Boolean(currentUser.id) && Boolean(assignmentId) && Boolean(studentId)
  );
  const studentWorkspace = workspaceQuery.data;
  const studentOverview = overviewQuery.data;
  const teacherWorkspace = teacherWorkspaceQuery.data;

  const assignments = isStudent
    ? (assignmentId ? (studentWorkspace?.assignment ? [studentWorkspace.assignment] : []) : (studentOverview?.assignments || []))
    : isTeacher && assignmentId
      ? (teacherWorkspace?.assignment ? [teacherWorkspace.assignment] : [])
      : compatibility.assignments;
  const portfolios = isStudent
    ? (assignmentId && studentWorkspace?.portfolio
      ? { [studentWorkspace.portfolio.id]: studentWorkspace.portfolio }
      : (studentOverview?.portfolios || {}))
    : isTeacher && assignmentId
      ? (teacherWorkspace?.portfolio ? { [teacherWorkspace.portfolio.id]: teacherWorkspace.portfolio } : {})
      : compatibility.portfolios;
  const feedbacks = isStudent
    ? (assignmentId ? (studentWorkspace?.feedbacks || []) : (studentOverview?.feedbacks || []))
    : isTeacher && assignmentId
      ? (teacherWorkspace?.feedbacks || [])
      : compatibility.feedbacks;
  const rubricSubmissions = isStudent
    ? (assignmentId ? (studentWorkspace?.rubricSubmissions || []) : (studentOverview?.rubricSubmissions || []))
    : isTeacher && assignmentId
      ? (teacherWorkspace?.rubricSubmissions || [])
      : compatibility.rubricSubmissions;
  const rubrics = isStudent
    ? (studentWorkspace?.rubric?.id ? { [studentWorkspace.rubric.id]: studentWorkspace.rubric } : {})
    : isTeacher && assignmentId
      ? (teacherWorkspace?.rubric?.id ? { [teacherWorkspace.rubric.id]: teacherWorkspace.rubric } : {})
      : compatibility.rubrics;

  const overviewAssignments = useMemo(() => assignments.map(item => {
    const itemPortfolio = portfolios[`port-${studentId}-${item.id}`];
    const versions = academicVersionsOf(itemPortfolio);
    const teacherScores = rubricSubmissions
      .filter(submission => submission.studentId === studentId && submission.assignmentId === item.id && submission.evaluatorRole === 'teacher')
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return {
      assignment: item,
      portfolio: itemPortfolio,
      versions,
      latestScore: teacherScores[0] || null
    };
  }), [assignments, portfolios, rubricSubmissions, studentId]);

  const portfolio = portfolios[`port-${studentId}-${assignmentId}`];
  const assignment = assignments.find(item => item.id === assignmentId);
  const activeRubric = assignment ? rubrics[assignment.rubricId] : undefined;
  const studentFeedback = feedbacks.filter(item => item.studentId === studentId && item.assignmentId === assignmentId);
  const academicVersions = academicVersionsOf(portfolio);

  const officialSubmissions = useMemo(() => rubricSubmissions
    .filter(item => item.studentId === studentId && item.assignmentId === assignmentId && item.evaluatorRole === 'teacher')
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()),
  [rubricSubmissions, studentId, assignmentId]);

  const peerSubmissions = useMemo(() => rubricSubmissions.filter(item =>
    item.studentId === studentId && item.assignmentId === assignmentId && item.evaluatorRole === 'peer'
  ), [rubricSubmissions, studentId, assignmentId]);

  const criterionMeta = useMemo(() => {
    if (!activeRubric) return {} as Record<string, { axisId: PoeticAxisId; max: number }>;
    return Object.fromEntries(activeRubric.criteria.map(criterion => {
      const max = criterion.levels.reduce((value, level) => Math.max(value, Number(level.score ?? level.level ?? 0)), 0);
      return [criterion.id, { axisId: criterion.axisId, max }];
    }));
  }, [activeRubric]);

  const trajectory = useMemo(() => officialSubmissions.map(submission => {
    const axes: Partial<Record<PoeticAxisId, number>> = {};
    Object.entries(submission.criterionScores).forEach(([criterionId, value]) => {
      const meta = criterionMeta[criterionId];
      if (!meta || meta.max <= 0) return;
      const score = Number(value.score ?? value.level ?? 0);
      if (Number.isFinite(score)) axes[meta.axisId] = Math.max(0, Math.min(100, (score / meta.max) * 100));
    });
    return { submission, axes };
  }), [officialSubmissions, criterionMeta]);

  const latest = trajectory.at(-1);
  const first = trajectory[0];
  const hasMultipleAssessments = trajectory.length >= 2;
  const axisRows = (Object.keys(labels) as PoeticAxisId[]).map(axis => {
    const rawFirst = first?.axes[axis];
    const rawLast = latest?.axes[axis];
    const firstScore = typeof rawFirst === 'number' && Number.isFinite(rawFirst) ? rawFirst : undefined;
    const lastScore = typeof rawLast === 'number' && Number.isFinite(rawLast) ? rawLast : undefined;
    return {
      axis,
      first: firstScore,
      last: lastScore,
      delta: hasMultipleAssessments && typeof firstScore === 'number' && typeof lastScore === 'number' ? lastScore - firstScore : null
    };
  });
  const weakest = axisRows.filter(row => typeof row.last === 'number' && Number.isFinite(row.last)).sort((a, b) => Number(a.last) - Number(b.last))[0];
  const resolved = studentFeedback.filter(item => item.resolved).length;

  const activeStudentQuery = assignmentId ? workspaceQuery : overviewQuery;
  const activeTeacherQuery = isTeacher && assignmentId ? teacherWorkspaceQuery : null;
  if (isTeacher && activeTeacherQuery?.isLoading && assignments.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Đang tải tiến độ học sinh</h2>
        <p className="text-sm text-slate-500">Đang lấy dữ liệu đúng hồ sơ và phiên bản được chọn…</p>
      </div>
    );
  }
  if (isTeacher && activeTeacherQuery?.isError && assignments.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Không thể tải tiến độ học sinh</h2>
        <p className="text-sm text-slate-500">
          {activeTeacherQuery.error instanceof Error ? activeTeacherQuery.error.message : 'Vui lòng thử lại.'}
        </p>
        <Button size="sm" variant="primary" onClick={() => void activeTeacherQuery.refetch()}>Thử lại</Button>
      </div>
    );
  }
  if (isStudent && activeStudentQuery.isLoading && assignments.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Đang tải tiến độ</h2>
        <p className="text-sm text-slate-500">Đang lấy dữ liệu của riêng hồ sơ này…</p>
      </div>
    );
  }
  if (isStudent && activeStudentQuery.isError && assignments.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Không thể tải tiến độ</h2>
        <p className="text-sm text-slate-500">
          {activeStudentQuery.error instanceof Error ? activeStudentQuery.error.message : 'Vui lòng thử lại.'}
        </p>
        <Button size="sm" variant="primary" onClick={() => void activeStudentQuery.refetch()}>Thử lại</Button>
      </div>
    );
  }

  if (!assignmentId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-20">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tiến độ học tập</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn một nhiệm vụ để xem điểm, góp ý và lịch sử các bản đã nộp.</p>
        </div>
        {overviewAssignments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có nhiệm vụ để xem tiến độ.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {overviewAssignments.map(({ assignment: item, portfolio: itemPortfolio, versions, latestScore }) => (
              <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{item.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {versions.length} bản đã nộp
                      {itemPortfolio?.versions.some(version => version.stage === 'prediction') ? ' · Có dự đoán trước khi đọc' : ''}
                    </p>
                  </div>
                  <Badge size="sm" variant="outline">
                    {latestScore ? `${latestScore.totalScore}/${latestScore.maxScore}` : 'Chưa có điểm'}
                  </Badge>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!itemPortfolio}
                    onClick={() => onNavigate('student-analytics', { assignmentId: item.id, studentId })}
                  >
                    Xem tiến độ
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Chưa có hồ sơ học tập</h2>
        <p className="text-sm text-slate-500">Hồ sơ sẽ xuất hiện sau khi bạn bắt đầu nhiệm vụ.</p>
        <Button size="sm" variant="primary" onClick={() => onNavigate('student-dashboard')}>
          Về danh sách nhiệm vụ
        </Button>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Không tìm thấy nhiệm vụ</h2>
        <p className="text-sm text-slate-500">Không thể hiển thị tiến độ vì thiếu nhiệm vụ.</p>
      </div>
    );
  }

  if (!activeRubric) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-900">Thiếu bảng tiêu chí chấm điểm của nhiệm vụ</h2>
        <p className="text-sm text-slate-500">Hệ thống không dùng bảng tiêu chí chấm điểm khác để thay thế vì có thể làm sai điểm.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-7 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('portfolio-list')}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Quay lại
            </Button>
            <span>·</span>
            <span className="font-medium text-slate-700">{assignment.title}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Tiến độ học tập</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Kết quả dưới đây dựa trên điểm giáo viên chấm.
          </p>
        </div>

        {academicVersions.length >= 2 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('version-diff', { assignmentId, studentId })}
            leftIcon={<DocumentDuplicateIcon className="h-4 w-4" />}
          >
            So sánh phiên bản
          </Button>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phiên bản đã nộp</span>
            <DocumentDuplicateIcon className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{academicVersions.length}</div>
          <div className="mt-1 text-xs text-slate-500">phiên bản đã lưu</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Góp ý</span>
            <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-primary-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{studentFeedback.length}</div>
          <div className="mt-1 text-xs text-slate-500">{resolved} góp ý đã được xử lý ở bản sửa</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm đánh giá gần nhất</span>
            <CheckBadgeIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {latest ? `${latest.submission.totalScore}/${latest.submission.maxScore}` : 'Chưa có'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {latest ? `Chấm vào ${new Date(latest.submission.submittedAt).toLocaleDateString('vi-VN')}` : 'Đang chờ giáo viên chấm'}
          </div>
        </div>
      </div>

      {/* Criteria Trajectory Table */}
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tiến bộ theo từng phần phân tích</h2>
            <p className="mt-0.5 text-xs text-slate-500">So sánh điểm của từng phần qua các lần nộp bài.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {officialSubmissions.length ? `${officialSubmissions.length} lần chấm` : 'Chưa có điểm'}
          </span>
        </div>

        {!officialSubmissions.length ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            Chưa có kết quả chấm từ giáo viên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Tiêu chí thi pháp</th>
                  <th className="px-4 py-3 text-center">Lần đầu</th>
                  <th className="px-4 py-3 text-center">Gần nhất</th>
                  <th className="px-4 py-3 text-right">Thay đổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {axisRows.map(row => (
                  <tr key={row.axis} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{labels[row.axis]}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">
                      {typeof row.first === 'number' ? `${row.first.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      {typeof row.last === 'number' ? `${row.last.toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {typeof row.delta === 'number' ? (
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-bold ${
                            row.delta > 0
                              ? 'text-emerald-800 bg-emerald-50'
                              : row.delta < 0
                              ? 'text-rose-800 bg-rose-50'
                              : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {row.delta > 0 ? `+${row.delta.toFixed(0)}` : row.delta.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {weakest && typeof weakest.last === 'number' && (
          <div className="rounded-lg border-l-3 border-amber-400 bg-amber-50/70 p-3 text-xs text-amber-900">
            <strong>Trục cần tập trung cải thiện:</strong> {labels[weakest.axis]} ({weakest.last.toFixed(0)}%).
            Hãy xem lại góp ý của giáo viên và đối chiếu ngữ liệu để hoàn thiện thêm ở bài sau.
          </div>
        )}

        {peerSubmissions.length > 0 && (
          <div className="text-xs text-slate-500 pt-1">
            Có {peerSubmissions.length} đánh giá từ bạn học; không tính vào điểm giáo viên.
          </div>
        )}
      </section>

      {/* Version History */}
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Lịch sử các phiên bản</h2>
          <p className="mt-0.5 text-xs text-slate-500">Xem các phiên bản đã nộp theo thời gian.</p>
        </div>

        {!academicVersions.length ? (
          <div className="p-6 text-center text-xs text-slate-500">Chưa có phiên bản nào.</div>
        ) : (
          <div className="space-y-3">
            {academicVersions.map(version => {
              const linked = studentFeedback.filter(
                item => item.versionId === version.id || item.versionNumber === version.versionNumber
              );
              return (
                <div key={version.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="primary">{learningVersionLabel(version)}</Badge>
                      <span className="font-bold text-slate-900">
                        {version.stage === 'prediction' ? 'Dự đoán trước khi đọc' : version.stage === 'initial' ? 'Bài đầu tiên đã nộp' : 'Bài đã sửa theo góp ý'}
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      {new Date(version.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  {version.changeSummary && (
                    <p className="text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Thay đổi:</strong> {version.changeSummary}
                    </p>
                  )}

                  {version.revisionReason && (
                    <p className="italic text-slate-500 leading-relaxed">
                      Lí do điều chỉnh: {version.revisionReason}
                    </p>
                  )}

                  {linked.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-700 block">Góp ý gắn với phiên bản này:</span>
                      {linked.map(item => (
                        <div key={item.id} className="rounded border-l-2 border-slate-300 bg-white p-2.5 text-slate-700 shadow-2xs">
                          <strong className="text-slate-900">
                            {item.authorRole === 'teacher' ? 'Giáo viên' : item.authorRole === 'ai' ? 'AI' : 'Bạn học'}:
                          </strong>{' '}
                          {item.comment}
                          {item.resolved && <span className="ml-1.5 text-emerald-700 font-semibold">· Đã xử lý</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

