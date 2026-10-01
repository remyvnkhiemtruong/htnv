import React from 'react';
import { useAuthStore } from '../app/store/useAuthStore';
import { academicVersionsOf, deriveStudentWorkflow } from '../app/workflow/workflowState';
import { WorkflowProgress } from '../components/workflow/WorkflowProgress';
import { Badge, Button } from '../components/ui';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useStudentOverviewQuery } from '../app/queries/studentAcademicQueries';

const statusLabel: Record<string, string> = {
  drafting: 'Đang làm',
  submitted_waiting_ai: 'Chờ góp ý AI',
  ai_proposed_waiting_teacher: 'Chờ giáo viên xem',
  teacher_feedback_needed: 'Cần giáo viên xem',
  feedback_received: 'Đã có góp ý',
  revising: 'Đang sửa bài',
  waiting_official_rubric: 'Chờ chấm Rubric',
  completed: 'Hoàn thành',
  v1_submitted: 'Đã nộp V1',
  v2_in_revision: 'Đang sửa V2'
};

export const PortfolioListV2: React.FC<{ onNavigate: (view: string, params?: any) => void }> = ({ onNavigate }) => {
  const user = useAuthStore(s => s.currentUser);
  const compatibility = usePortfolio();
  const overviewQuery = useStudentOverviewQuery(user.role === 'student' && Boolean(user.id));
  const overview = overviewQuery.data;
  const assignments = user.role === 'student' ? (overview?.assignments || []) : compatibility.assignments;
  const portfolios = user.role === 'student' ? (overview?.portfolios || {}) : compatibility.portfolios;
  const feedbacks = user.role === 'student' ? (overview?.feedbacks || []) : compatibility.feedbacks;
  const rubricSubmissions = user.role === 'student' ? (overview?.rubricSubmissions || []) : compatibility.rubricSubmissions;
  const reflections = user.role === 'student' ? (overview?.reflections || []) : compatibility.reflections;
  const reflectionIds = reflections.filter(r => r.studentId === user.id).map(r => r.versionId);
  const allPortfolios = Object.values(portfolios);

  if (user.role !== 'student') {
    return (
      <div className="mx-auto max-w-6xl space-y-5 pb-16">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-950">
            {user.role === 'peer' ? 'Hồ sơ phản biện' : user.role === 'researcher' ? 'Hồ sơ nghiên cứu' : user.role === 'ai' ? 'Hồ sơ cần phản hồi' : 'Hồ sơ học sinh'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.role === 'researcher'
              ? 'Chỉ hiển thị dữ liệu ẩn danh trong phạm vi nghiên cứu.'
              : user.role === 'peer'
                ? 'Chỉ hiển thị các bài được phân công cho bạn.'
                : user.role === 'ai'
                  ? 'Chỉ hiển thị các bài đang nằm trong hàng phản hồi của bạn.'
                  : 'Xem bài nộp và trạng thái của từng hồ sơ.'}
          </p>
        </div>

        {allPortfolios.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có hồ sơ trong phạm vi của bạn.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {allPortfolios.map(portfolio => {
              const assignment = assignments.find(item => item.id === portfolio.assignmentId);
              const versions = academicVersionsOf(portfolio);
              const latest = versions[versions.length - 1];
              const canReview = user.role === 'teacher' || user.role === 'peer' || user.role === 'admin';
              const canOpenAi = user.role === 'ai';
              return (
                <article key={portfolio.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{portfolio.studentName || 'Hồ sơ'}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {assignment?.title || 'Nhiệm vụ'}
                        {portfolio.className ? ` · ${portfolio.className}` : ''}
                      </div>
                    </div>
                    <Badge size="sm" variant="outline">{statusLabel[portfolio.status] || 'Đang xử lý'}</Badge>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    {versions.length} bản V1/V2
                    {portfolio.versions.some(version => version.stage === 'prediction') ? ' · Có V0' : ''}
                    {latest ? ` · Mới nhất: ${latest.versionNumber}` : ''}
                  </div>
                  {(canReview || canOpenAi) && versions.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => canOpenAi
                          ? onNavigate('ai-workspace')
                          : onNavigate('teacher-review', {
                              studentId: portfolio.studentId,
                              assignmentId: portfolio.assignmentId,
                              isPeerMode: user.role === 'peer'
                            })}
                      >
                        {user.role === 'teacher' ? 'Chấm bài' : user.role === 'peer' ? 'Đánh giá' : user.role === 'ai' ? 'Nhập phản hồi' : 'Xem bài'}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (overviewQuery.isLoading && assignments.length === 0) {
    return <div className="py-12 text-center text-sm text-slate-500">Đang tải hồ sơ…</div>;
  }

  if (overviewQuery.isError && assignments.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-12 text-center">
        <h2 className="text-base font-semibold text-slate-900">Không thể tải hồ sơ</h2>
        <p className="text-sm text-slate-500">
          {overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Vui lòng thử lại.'}
        </p>
        <Button variant="primary" onClick={() => void overviewQuery.refetch()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map(assignment => {
        const portfolio = portfolios[`port-${user.id}-${assignment.id}`];
        const versions = academicVersionsOf(portfolio);
        const state = deriveStudentWorkflow({
          assignment,
          portfolio,
          feedbacks,
          rubricSubmissions,
          reflectionVersionIds: reflectionIds
        });
        return (
          <div key={assignment.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{assignment.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {versions.length} bản V1/V2 · {portfolio?.versions.some(v => v.stage === 'prediction') ? 'Có V0' : 'Chưa có V0'}
                </div>
              </div>
              <span className="text-xs text-slate-500">{state.statusLabel}</span>
            </div>
            <div className="mt-3"><WorkflowProgress state={state} compact /></div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="primary" onClick={() => onNavigate('editor', { assignmentId: assignment.id })}>Mở hồ sơ</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

