import { learningVersionLabel } from '../../utils/learningLabels';
import React, { useEffect, useMemo, useState } from 'react';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../app/store/useAuthStore';
import { useStudentOverviewQuery } from '../../app/queries/studentAcademicQueries';
import { usePortfolio } from '../../contexts/PortfolioContext';
import { Badge, Button, Drawer } from '../ui';

interface NotificationCenterProps {
  onNavigate: (view: string, params?: Record<string, unknown>) => void;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  tone: 'slate' | 'blue' | 'amber' | 'emerald' | 'purple';
  view: string;
  params?: Record<string, unknown>;
}

const readStorageKey = (userId: string) => `htnv_notification_read_${userId}`;

const loadReadIds = (userId: string) => {
  if (!userId) return new Set<string>();
  try {
    const raw = localStorage.getItem(readStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const { portfolios, aiReviews, rubricSubmissions } = usePortfolio();
  const studentOverview = useStudentOverviewQuery(currentUser.id, currentUser.role === 'student' && Boolean(currentUser.id));
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(currentUser.id));

  useEffect(() => {
    setReadIds(loadReadIds(currentUser.id));
  }, [currentUser.id]);

  const notifications = useMemo<AppNotification[]>(() => {
    if (!currentUser.id) return [];

    if (currentUser.role === 'student') {
      const overview = studentOverview.data;
      if (!overview) return [];
      const items: AppNotification[] = [];
      for (const feedback of overview.feedbacks.filter(item => !item.resolved)) {
        const assignment = overview.assignments.find(item => item.id === feedback.assignmentId);
        items.push({
          id: `feedback:${feedback.id}`,
          title: feedback.authorRole === 'teacher' ? 'Có nhận xét mới của giáo viên' : feedback.authorRole === 'ai' ? 'Có góp ý AI mới' : 'Có phản hồi mới',
          message: `${assignment?.title || feedback.assignmentId} · ${learningVersionLabel(feedback.versionNumber)} · ${feedback.comment.slice(0, 110)}`,
          createdAt: feedback.createdAt,
          tone: feedback.authorRole === 'teacher' ? 'amber' : feedback.authorRole === 'ai' ? 'blue' : 'slate',
          view: 'editor',
          params: { assignmentId: feedback.assignmentId }
        });
      }
      for (const rubric of overview.rubricSubmissions.filter(item => item.evaluatorRole === 'teacher')) {
        const assignment = overview.assignments.find(item => item.id === rubric.assignmentId);
        items.push({
          id: `rubric:${rubric.id}`,
          title: 'Giáo viên đã chấm bài',
          message: `${assignment?.title || rubric.assignmentId} · ${learningVersionLabel(rubric.versionNumber)} · ${rubric.totalScore}/${rubric.maxScore} điểm`,
          createdAt: rubric.submittedAt,
          tone: 'emerald',
          view: 'student-analytics',
          params: { assignmentId: rubric.assignmentId, studentId: currentUser.id }
        });
      }
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 40);
    }

    if (currentUser.role === 'teacher') {
      const items: AppNotification[] = [];
      for (const review of aiReviews.filter(review => review.status === 'completed' && review.teacher_review_status === 'pending')) {
        items.push({
          id: `ai-review:${review.id}`,
          title: 'Góp ý AI cần giáo viên xem',
          message: `${review.student_name} · ${learningVersionLabel(review.version_number)}`,
          createdAt: review.completed_at || review.created_at,
          tone: 'blue',
          view: 'teacher-review',
          params: { assignmentId: review.assignment_id, studentId: review.student_id }
        });
      }
      for (const portfolio of Object.values(portfolios)) {
        const teacherRubric = rubricSubmissions.some(item =>
          item.assignmentId === portfolio.assignmentId &&
          item.studentId === portfolio.studentId &&
          item.evaluatorRole === 'teacher'
        );
        if (portfolio.status === 'waiting_official_rubric' && !teacherRubric) {
          const latest = [...portfolio.versions].reverse().find(version => version.stage !== 'prediction');
          items.push({
            id: `rubric-wait:${portfolio.id}:${latest?.id || 'latest'}`,
            title: 'Bài đã sẵn sàng để chấm',
            message: `${portfolio.studentName} · ${portfolio.className || 'Chưa rõ lớp'} · ${learningVersionLabel(latest?.versionNumber || portfolio.currentActiveVersion)}`,
            createdAt: latest?.createdAt || portfolio.lastAutosavedAt,
            tone: 'purple',
            view: 'teacher-review',
            params: { assignmentId: portfolio.assignmentId, studentId: portfolio.studentId }
          });
        }
        if (portfolio.status === 'teacher_feedback_needed' || portfolio.status === 'ai_proposed_waiting_teacher') {
          const latest = [...portfolio.versions].reverse().find(version => version.stage !== 'prediction');
          items.push({
            id: `teacher-action:${portfolio.id}:${latest?.id || 'latest'}`,
            title: 'Bài cần giáo viên xử lý',
            message: `${portfolio.studentName} · ${learningVersionLabel(latest?.versionNumber || portfolio.currentActiveVersion)}`,
            createdAt: latest?.createdAt || portfolio.lastAutosavedAt,
            tone: 'amber',
            view: 'teacher-review',
            params: { assignmentId: portfolio.assignmentId, studentId: portfolio.studentId }
          });
        }
      }
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);
    }

    return [];
  }, [aiReviews, currentUser.id, currentUser.role, portfolios, rubricSubmissions, studentOverview.data]);

  const persistRead = (next: Set<string>) => {
    setReadIds(next);
    try { localStorage.setItem(readStorageKey(currentUser.id), JSON.stringify([...next].slice(-300))); } catch { /* ignore */ }
  };

  const markRead = (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    persistRead(next);
  };

  const unreadCount = notifications.filter(item => !readIds.has(item.id)).length;

  const openNotification = (item: AppNotification) => {
    markRead(item.id);
    setOpen(false);
    onNavigate(item.view, item.params);
  };

  const markAllRead = () => {
    const next = new Set(readIds);
    notifications.forEach(item => next.add(item.id));
    persistRead(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
      >
        <BellIcon className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-600 px-1 text-center text-[9px] font-bold leading-4 text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Thông báo"
        width="md"
        footer={
          notifications.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={markAllRead} leftIcon={<CheckIcon className="h-4 w-4" />}>
              Đánh dấu tất cả đã đọc
            </Button>
          ) : undefined
        }
      >
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <BellIcon className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">Chưa có việc mới</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Góp ý, điểm số và việc cần xử lý sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(item => {
              const unread = !readIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 ${unread ? 'border-primary-200 bg-primary-50/40' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-label="Chưa đọc" />}
                      </div>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{item.message}</p>
                    </div>
                    <Badge size="sm" variant={item.tone}>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Drawer>
    </>
  );
};
