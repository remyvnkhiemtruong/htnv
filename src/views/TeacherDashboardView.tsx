import React from 'react';
import { Button, PageHeader } from '../components/ui';
import { TeacherReviewInbox } from '../components/teacher/TeacherReviewInbox';
import { usePortfolio } from '../contexts/PortfolioContext';

interface Props { onNavigate: (view: string, params?: any) => void; }

type MetricTileProps = {
  label: string;
  value: number;
  note: string;
  tone?: 'default' | 'success' | 'warning' | 'info';
  onClick: () => void;
};

const MetricTile: React.FC<MetricTileProps> = ({ label, value, note, tone = 'default', onClick }) => {
  const toneClass = tone === 'success'
    ? 'border-emerald-600'
    : tone === 'warning'
      ? 'border-amber-600'
      : tone === 'info'
        ? 'border-sky-600'
        : 'border-slate-300';
  return (
    <button type="button" onClick={onClick} className={`w-full border-l-2 py-1 pl-4 text-left hover:bg-slate-50 ${toneClass}`}>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{note}</div>
      </div>
    </button>
  );
};

export const TeacherDashboardView: React.FC<Props> = ({ onNavigate }) => {
  const { assignments, portfolios, aiReviews, rubricSubmissions } = usePortfolio();
  const list = Object.values(portfolios);
  const submitted = list.filter(portfolio => portfolio.versions.some(version => version.stage !== 'prediction'));
  const aiPending = aiReviews.filter(review => review.status === 'completed' && review.teacher_review_status === 'pending').length;
  const rubricPending = submitted.filter(portfolio =>
    portfolio.status === 'waiting_official_rubric' &&
    !rubricSubmissions.some(submission =>
      submission.studentId === portfolio.studentId &&
      submission.assignmentId === portfolio.assignmentId &&
      submission.evaluatorRole === 'teacher'
    )
  ).length;
  const revising = submitted.filter(portfolio =>
    portfolio.status === 'feedback_received' ||
    portfolio.status === 'revising' ||
    portfolio.status === 'v2_in_revision'
  ).length;
  const done = submitted.filter(portfolio => portfolio.status === 'completed').length;
  const teacherPending = submitted.filter(portfolio =>
    portfolio.status === 'ai_proposed_waiting_teacher' ||
    portfolio.status === 'teacher_feedback_needed'
  ).length;
  const actionCount = aiPending + rubricPending + teacherPending;

  return (
    <div className="v3-page space-y-6 pb-20">
      <PageHeader
        eyebrow="Giảng dạy"
        title="Bài cần xử lý"
        description={`${actionCount} việc cần xử lý · ${submitted.length} bài bài đầu tiên và bài chỉnh sửa đã nộp.`}
        actions={<Button variant="primary" onClick={() => onNavigate('assignment-builder')}>Tạo nhiệm vụ</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Cần xem" value={teacherPending} note="Góp ý đang chờ" tone={teacherPending ? 'warning' : 'success'} onClick={() => onNavigate('teacher-review')} />
        <MetricTile label="Phản hồi AI" value={aiPending} note="Cần giáo viên xem" tone={aiPending ? 'info' : 'default'} onClick={() => onNavigate('teacher-review')} />
        <MetricTile label="Chờ chấm điểm" value={rubricPending} note="Đã có phiếu tự nhìn lại bài làm" tone={rubricPending ? 'warning' : 'default'} onClick={() => onNavigate('teacher-review')} />
        <MetricTile label="Đang sửa bài" value={revising} note="Sau góp ý" onClick={() => onNavigate('portfolio-list')} />
        <MetricTile label="Hoàn thành" value={done} note="Đã chấm xong" tone="success" onClick={() => onNavigate('portfolio-list')} />
      </div>

      <TeacherReviewInbox
        assignments={assignments}
        portfolios={portfolios}
        aiReviews={aiReviews}
        rubricSubmissions={rubricSubmissions}
        onNavigate={onNavigate}
      />

      <section className="v3-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">{assignments.length} nhiệm vụ</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">Tạo nhiệm vụ, quản lý ngữ liệu và bảng tiêu chí chấm điểm ở mục “Giảng dạy”.</div>
        </div>
        <Button variant="outline" onClick={() => onNavigate('class-analytics')}>Xem phân tích lớp</Button>
      </section>
    </div>
  );
};
