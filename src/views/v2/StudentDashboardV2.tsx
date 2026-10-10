import React from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../app/store/useAuthStore';
import { useStudentOverviewQuery } from '../../app/queries/studentAcademicQueries';
import { deriveStudentWorkflow } from '../../app/workflow/workflowState';
import { WorkflowProgress } from '../../components/workflow/WorkflowProgress';
import { Badge, Button, Card, PageHeader, Skeleton, SkeletonCard } from '../../components/ui';

type MetricTileProps = {
  label: string;
  value: string | number;
  note: string;
  tone?: 'default' | 'success' | 'warning' | 'accent';
};

const MetricTile: React.FC<MetricTileProps> = ({ label, value, note, tone = 'default' }) => {
  const toneClass = tone === 'success'
    ? 'border-emerald-600'
    : tone === 'warning'
      ? 'border-amber-600'
      : tone === 'accent'
        ? 'border-primary-700'
        : 'border-slate-300';
  return (
    <div className={`border-l-2 py-1 pl-4 ${toneClass}`}>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        <div className="mt-1 truncate text-xs text-slate-500">{note}</div>
      </div>
    </div>
  );
};

export const StudentDashboardView: React.FC<{ onNavigate: (view: string, params?: any) => void }> = ({ onNavigate }) => {
  const user = useAuthStore(s => s.currentUser);
  const overviewQuery = useStudentOverviewQuery(user.id, user.role === 'student' && Boolean(user.id));
  const overview = overviewQuery.data;
  const assignments = overview?.assignments || [];
  const portfolios = overview?.portfolios || {};
  const feedbacks = overview?.feedbacks || [];
  const rubricSubmissions = overview?.rubricSubmissions || [];
  const reflections = overview?.reflections || [];
  const isLoading = overviewQuery.isLoading;
  const reflectionIds = reflections.filter(r => r.studentId === user.id).map(r => r.versionId);
  const items = assignments.map(assignment => ({
    assignment,
    portfolio: portfolios[`port-${user.id}-${assignment.id}`],
    state: deriveStudentWorkflow({
      assignment,
      portfolio: portfolios[`port-${user.id}-${assignment.id}`],
      feedbacks,
      rubricSubmissions,
      reflectionVersionIds: reflectionIds
    })
  }));
  const next = items.find(item => !item.state.isComplete) || items[0];
  const completed = items.filter(item => item.state.isComplete).length;
  const averageProgress = items.length ? Math.round(items.reduce((sum, item) => sum + item.state.progress, 0) / items.length) : 0;
  const studentFeedbacks = feedbacks.filter(item => item.studentId === user.id);
  const unresolvedFeedbacks = studentFeedbacks.filter(item => !item.resolved);
  const recentFeedbacks = [...studentFeedbacks].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 3);

  if (overviewQuery.isError && assignments.length === 0) {
    return (
      <div className="v3-page space-y-5 pb-20">
        <PageHeader
          eyebrow="Bàn học"
          title="Không thể tải dữ liệu"
          description={overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Không thể tải bàn học lúc này.'}
        />
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Dữ liệu chưa được tải. Bạn có thể thử lại mà không cần tải lại toàn trang.</p>
            <Button variant="primary" onClick={() => void overviewQuery.refetch()}>Thử lại</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading && assignments.length === 0) {
    return (
      <div className="v3-page space-y-6 pb-20">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="v3-page space-y-6 pb-20">
      <PageHeader
        eyebrow="Bàn học"
        title={`Chào ${user.name}`}
        description={<span>{user.className ? `Lớp ${user.className} · ` : ''}{completed}/{items.length} nhiệm vụ đã hoàn thành.</span>}
        actions={<Button variant="outline" onClick={() => onNavigate('assignment-list')}>Tất cả nhiệm vụ</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile label="Tiến độ chung" value={`${averageProgress}%`} note={`${completed}/${items.length} nhiệm vụ hoàn tất`} tone="accent" />
        <MetricTile label="Phản hồi cần xem" value={unresolvedFeedbacks.length} note="AI · giáo viên · phản biện" tone={unresolvedFeedbacks.length ? 'warning' : 'success'} />
        <MetricTile label="Nhiệm vụ đang học" value={Math.max(0, items.length - completed)} note="Dự đoán · Làm bài · Sửa bài · Tự nhìn lại" />
      </div>

      {next ? (
        <section className="v3-panel overflow-hidden border-primary-200">
          <div className="border-b border-primary-100 bg-primary-50/65 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="v3-kicker">Việc tiếp theo</div>
              <Badge variant={next.state.isComplete ? 'emerald' : 'primary'}>{next.state.isComplete ? 'Đã hoàn thành' : `${next.state.progress}%`}</Badge>
            </div>
          </div>
          <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{next.assignment.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{next.state.nextActionHint}</p>
              <div className="mt-5"><WorkflowProgress state={next.state} /></div>
            </div>
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRightIcon className="h-4 w-4" />}
              onClick={() => onNavigate('editor', { assignmentId: next.assignment.id })}
              className="w-full lg:w-auto"
            >
              {next.state.nextActionLabel}
            </Button>
          </div>
        </section>
      ) : (
        <Card><p className="text-sm text-slate-600">Chưa có nhiệm vụ nào được giao.</p></Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.6fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Nhiệm vụ của bạn</h2>
              <p className="mt-0.5 text-xs text-slate-500">Theo dõi tiến độ của từng bài.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('assignment-list')}>Xem tất cả</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.slice(0, 4).map(item => (
              <button
                type="button"
                key={item.assignment.id}
                onClick={() => onNavigate('editor', { assignmentId: item.assignment.id })}
                className="v3-panel v3-panel-interactive p-4 text-left sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{item.assignment.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.state.nextActionHint}</div>
                  </div>
                  <Badge size="sm" variant={item.state.isComplete ? 'emerald' : item.state.progress >= 50 ? 'primary' : 'slate'}>{item.state.progress}%</Badge>
                </div>
                <div className="mt-4"><WorkflowProgress state={item.state} compact /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">Góp ý gần đây</h2>
            <p className="mt-0.5 text-xs text-slate-500">Mở bài để xem góp ý.</p>
          </div>
          <div className="v3-panel divide-y divide-slate-100 overflow-hidden">
            {recentFeedbacks.length ? recentFeedbacks.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => onNavigate('editor', { assignmentId: item.assignmentId })}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
              >
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.resolved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {item.resolved ? <CheckCircleIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-800">{item.authorName}</span>
                    <Badge size="sm" variant={item.authorRole === 'ai' ? 'blue' : item.authorRole === 'teacher' ? 'primary' : 'slate'}>{item.authorRole === 'ai' ? 'AI' : item.authorRole === 'teacher' ? 'GV' : 'Peer'}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.comment}</p>
                </div>
              </button>
            )) : <div className="px-4 py-8 text-center text-sm text-slate-500">Chưa có phản hồi mới.</div>}
          </div>
        </section>
      </div>
    </div>
  );
};
