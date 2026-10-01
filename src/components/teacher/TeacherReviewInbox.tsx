import React, { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { AiReviewRequest, Assignment, RubricAssessmentSubmission, StudentPortfolio } from '../../types';
import { Badge, Button } from '../ui';

type InboxFilter = 'priority' | 'ai' | 'rubric' | 'all';
type Tone = 'slate' | 'blue' | 'amber' | 'emerald' | 'purple' | 'outline';

interface TeacherReviewInboxProps {
  assignments: Assignment[];
  portfolios: Record<string, StudentPortfolio>;
  aiReviews: AiReviewRequest[];
  rubricSubmissions: RubricAssessmentSubmission[];
  onNavigate: (view: string, params?: Record<string, unknown>) => void;
}

interface InboxItem {
  id: string;
  portfolio: StudentPortfolio;
  assignment?: Assignment;
  latestVersion: StudentPortfolio['versions'][number] | undefined;
  kind: 'teacher' | 'ai' | 'rubric' | 'waiting';
  label: string;
  tone: Tone;
  priority: number;
  timestamp: string;
}

const metaFor = (
  portfolio: StudentPortfolio,
  hasAiPending: boolean,
  teacherRubricDone: boolean
): Pick<InboxItem, 'kind' | 'label' | 'tone' | 'priority'> => {
  if (portfolio.status === 'teacher_feedback_needed' || portfolio.status === 'ai_proposed_waiting_teacher') {
    return { kind: 'teacher', label: 'Cần giáo viên xem', tone: 'amber', priority: 1 };
  }
  if (hasAiPending) return { kind: 'ai', label: 'AI chờ xem', tone: 'blue', priority: 1 };
  if (portfolio.status === 'waiting_official_rubric' && !teacherRubricDone) {
    return { kind: 'rubric', label: 'Chờ chấm Rubric', tone: 'purple', priority: 2 };
  }
  return { kind: 'waiting', label: 'Đang theo dõi', tone: 'slate', priority: 5 };
};

const relativeAge = (value: string) => {
  const ageMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'vừa cập nhật';
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 60) return minutes <= 1 ? 'vừa cập nhật' : `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

export const TeacherReviewInbox: React.FC<TeacherReviewInboxProps> = ({
  assignments,
  portfolios,
  aiReviews,
  rubricSubmissions,
  onNavigate
}) => {
  const [filter, setFilter] = useState<InboxFilter>('priority');
  const [search, setSearch] = useState('');

  const assignmentById = useMemo(() => new Map(assignments.map(item => [item.id, item])), [assignments]);

  const queue = useMemo(() => Object.values(portfolios)
    .filter(portfolio => portfolio.versions.some(version => version.stage !== 'prediction') && portfolio.status !== 'completed')
    .map(portfolio => {
      const latestVersion = [...portfolio.versions].reverse().find(version => version.stage !== 'prediction');
      const hasAiPending = aiReviews.some(review =>
        review.assignment_id === portfolio.assignmentId &&
        review.student_id === portfolio.studentId &&
        review.version_number === latestVersion?.versionNumber &&
        review.status === 'completed' &&
        review.teacher_review_status === 'pending'
      );
      const teacherRubricDone = rubricSubmissions.some(submission =>
        submission.assignmentId === portfolio.assignmentId &&
        submission.studentId === portfolio.studentId &&
        submission.versionNumber === latestVersion?.versionNumber &&
        submission.evaluatorRole === 'teacher'
      );
      const meta = metaFor(portfolio, hasAiPending, teacherRubricDone);
      return {
        id: portfolio.id,
        portfolio,
        assignment: assignmentById.get(portfolio.assignmentId),
        latestVersion,
        ...meta,
        timestamp: latestVersion?.createdAt || portfolio.lastAutosavedAt
      } satisfies InboxItem;
    })
    .sort((a, b) => a.priority - b.priority || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [
      aiReviews,
      assignmentById,
      portfolios,
      rubricSubmissions
    ]);

  const counts = useMemo(() => ({
    priority: queue.filter(item => item.priority <= 2).length,
    ai: queue.filter(item => item.kind === 'ai' || item.kind === 'teacher').length,
    rubric: queue.filter(item => item.kind === 'rubric').length,
    all: queue.length
  }), [queue]);

  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return queue.filter(item => {
      if (filter === 'priority' && item.priority > 2) return false;
      if (filter === 'ai' && item.kind !== 'ai' && item.kind !== 'teacher') return false;
      if (filter === 'rubric' && item.kind !== 'rubric') return false;
      if (!needle) return true;
      return [
        item.portfolio.studentName,
        item.portfolio.className,
        item.assignment?.title,
        item.latestVersion?.versionNumber
      ].some(value => String(value || '').toLocaleLowerCase('vi').includes(needle));
    });
  }, [filter, queue, search]);

  const filters: Array<{ id: InboxFilter; label: string }> = [
    { id: 'priority', label: 'Ưu tiên' },
    { id: 'ai', label: 'Góp ý AI' },
    { id: 'rubric', label: 'Chờ Rubric' },
    { id: 'all', label: 'Tất cả' }
  ];

  return (
    <section className="v3-panel overflow-hidden">
      <div className="space-y-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Hộp bài cần xử lý</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Ưu tiên bài có góp ý AI cần xem và bài đã nộp REF1 chờ chấm chính thức.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tìm học sinh, lớp, nhiệm vụ..."
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${filter === item.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              {item.label} <span className={filter === item.id ? 'text-slate-300' : 'text-slate-400'}>({counts[item.id]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {visible.map(item => (
          <div key={item.id} className="flex flex-col gap-3 px-4 py-3.5 hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{item.portfolio.studentName}</span>
                <Badge size="sm" variant={item.tone}>{item.label}</Badge>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                {item.portfolio.className || '—'} · {item.assignment?.title || item.portfolio.assignmentId}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {item.latestVersion?.versionNumber || item.portfolio.currentActiveVersion} · {relativeAge(item.timestamp)}
                {item.assignment?.deadline ? ` · hạn ${new Date(item.assignment.deadline).toLocaleDateString('vi-VN')}` : ''}
              </div>
            </div>
            <Button
              size="sm"
              variant={item.priority <= 2 ? 'primary' : 'outline'}
              onClick={() => onNavigate('teacher-review', {
                studentId: item.portfolio.studentId,
                assignmentId: item.portfolio.assignmentId
              })}
            >
              Mở bài
            </Button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Không có bài phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>
    </section>
  );
};
