import React from 'react';
import { useAuthStore } from '../app/store/useAuthStore';
import { academicVersionsOf, deriveStudentWorkflow } from '../app/workflow/workflowState';
import { WorkflowProgress } from '../components/workflow/WorkflowProgress';
import { Button } from '../components/ui';
import { usePortfolio } from '../contexts/PortfolioContext';

interface AssignmentListViewProps { onNavigate: (view: string, params?: any) => void; }

const homeForRole = (role: string) =>
  role === 'teacher' ? 'teacher-dashboard'
    : role === 'researcher' ? 'researcher-view'
      : role === 'admin' ? 'admin-view'
        : role === 'peer' ? 'portfolio-list'
          : 'dashboard';

export const AssignmentListView: React.FC<AssignmentListViewProps> = ({ onNavigate }) => {
  const user = useAuthStore(s => s.currentUser);
  const { assignments, literatureTexts, portfolios, feedbacks, rubricSubmissions, reflections } = usePortfolio();
  const reflectionIds = reflections.filter(r => r.studentId === user.id).map(r => r.versionId);
  const portfolioValues = Object.values(portfolios);

  if (user.role !== 'student') {
    const reviewLabel = user.role === 'teacher' ? 'Chấm bài' : user.role === 'peer' ? 'Đánh giá' : user.role === 'ai' ? 'Nhập phản hồi' : 'Xem hồ sơ';
    return (
      <div className="mx-auto max-w-6xl space-y-5 pb-16">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Nhiệm vụ</h1>
            <p className="mt-1 text-sm text-slate-500">
              {user.role === 'researcher'
                ? 'Danh sách nhiệm vụ trong phạm vi dữ liệu nghiên cứu.'
                : user.role === 'peer'
                  ? 'Các nhiệm vụ có bài được phân công cho bạn.'
                  : user.role === 'ai'
                    ? 'Các nhiệm vụ có bài đang chờ phản hồi AI.'
                    : 'Xem nhiệm vụ và số hồ sơ học sinh trong phạm vi được phép.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate(homeForRole(user.role))}>Trang chính</Button>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có nhiệm vụ trong phạm vi của bạn.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.map(assignment => {
              const scoped = portfolioValues.filter(item => item.assignmentId === assignment.id);
              const submitted = scoped.filter(item => academicVersionsOf(item).length > 0).length;
              const text = literatureTexts.find(item => item.id === assignment.textId);
              const canOpenReview = user.role === 'teacher' || user.role === 'peer' || user.role === 'admin';
              return (
                <article key={assignment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-slate-900">{assignment.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {text ? `${text.title} — ${text.author}` : 'Ngữ liệu'}
                        {assignment.classId ? ` · ${assignment.classId}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {submitted}/{scoped.length} đã nộp
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {scoped.length} hồ sơ · {submitted} hồ sơ có V1/V2.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => user.role === 'ai'
                        ? onNavigate('ai-workspace')
                        : canOpenReview
                          ? onNavigate('teacher-review', { assignmentId: assignment.id, isPeerMode: user.role === 'peer' })
                          : onNavigate('portfolio-list')}
                    >
                      {reviewLabel}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Nhiệm vụ học tập</h1>
          <p className="mt-1 text-sm text-slate-500">Xem tiến độ và tiếp tục các nhiệm vụ được giao.</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate('dashboard')}>Bàn học</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {assignments.map(assignment => {
          const state = deriveStudentWorkflow({
            assignment,
            portfolio: portfolios[`port-${user.id}-${assignment.id}`],
            feedbacks,
            rubricSubmissions,
            reflectionVersionIds: reflectionIds
          });
          const text = literatureTexts.find(t => t.id === assignment.textId);
          return (
            <article key={assignment.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{assignment.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">{text ? `${text.title} — ${text.author}` : 'Ngữ liệu'}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{state.statusLabel}</span>
              </div>
              <div className="mt-3"><WorkflowProgress state={state} /></div>
              <p className="mt-3 text-sm text-slate-600">{state.nextActionHint}</p>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="primary" onClick={() => onNavigate('editor', { assignmentId: assignment.id })}>
                  {state.nextActionLabel}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

