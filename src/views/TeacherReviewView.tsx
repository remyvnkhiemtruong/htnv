import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../app/store/useAuthStore';
import { useNotificationStore } from '../app/store/useNotificationStore';
import { usePortfolio } from '../contexts/PortfolioContext';
import { POETIC_AXES } from '../data/seedData';
import type { PoeticAxisId, RubricMatrix } from '../types';
import { Badge, Button } from '../components/ui';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  DocumentCheckIcon,
  SparklesIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

interface TeacherReviewViewProps {
  studentId?: string;
  assignmentId?: string;
  isPeerMode?: boolean;
  onNavigate: (view: string, extraParams?: unknown) => void;
}

const StatePanel: React.FC<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}> = ({ title, message, actionLabel, onAction, loading }) => (
  <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
    {loading && <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary-700" />}
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    <p className="text-sm leading-relaxed text-slate-500">{message}</p>
    {actionLabel && onAction && <div className="pt-2"><Button variant="primary" onClick={onAction}>{actionLabel}</Button></div>}
  </div>
);

type InspectorTab = 'comment' | 'rubric' | 'ai' | 'reflection';

export const TeacherReviewView: React.FC<TeacherReviewViewProps> = ({
  studentId,
  assignmentId,
  isPeerMode = false,
  onNavigate
}) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const {
    assignments,
    literatureTexts,
    portfolios,
    feedbacks,
    rubric,
    rubrics,
    rubricSubmissions,
    aiReviews,
    reflections,
    isLoading,
    dataError,
    addAnchoredFeedback,
    submitRubric,
    refreshAcademicData
  } = usePortfolio();
  const { addToast } = useNotificationStore();

  const queue = useMemo(() => {
    const all = Object.values(portfolios).filter(item => item.versions.length > 0);
    const scoped = assignmentId ? all.filter(item => item.assignmentId === assignmentId) : all;
    return [...scoped].sort((a, b) => a.studentName.localeCompare(b.studentName, 'vi'));
  }, [portfolios, assignmentId]);

  const requestedStudentMissing = Boolean(studentId && queue.length > 0 && !queue.some(item => item.studentId === studentId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeAxisId, setActiveAxisId] = useState<PoeticAxisId>('plot_situation');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isSubmittingRubric, setIsSubmittingRubric] = useState(false);
  const [isEditingAiProposal, setIsEditingAiProposal] = useState(false);
  const [editedAiText, setEditedAiText] = useState('');
  const [isSubmittingAiReview, setIsSubmittingAiReview] = useState(false);
  const [activeTab, setActiveTab] = useState<InspectorTab>('comment');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'pending' | 'graded'>('all');

  useEffect(() => {
    if (!queue.length) {
      setCurrentIndex(0);
      return;
    }
    if (studentId) {
      const requested = queue.findIndex(item => item.studentId === studentId);
      if (requested >= 0) setCurrentIndex(requested);
      return;
    }
    if (currentIndex >= queue.length) setCurrentIndex(0);
  }, [queue, studentId, currentIndex]);

  const currentPortfolio = requestedStudentMissing ? undefined : queue[currentIndex];
  const assignment = currentPortfolio ? assignments.find(item => item.id === currentPortfolio.assignmentId) : undefined;
  const literatureText = assignment ? literatureTexts.find(item => item.id === assignment.textId) : undefined;
  const activeRubric: RubricMatrix = assignment ? (rubrics[assignment.rubricId] || rubric) : rubric;

  const latestVersionNumber = currentPortfolio?.versions[currentPortfolio.versions.length - 1]?.versionNumber || '';
  useEffect(() => {
    setSelectedVersion(latestVersionNumber);
  }, [currentPortfolio?.id, latestVersionNumber]);

  const evaluatorRole = currentUser.role === 'peer' || isPeerMode ? 'peer' : 'teacher';
  const isAdminReadOnly = currentUser.role === 'admin';
  const reviewHome = currentUser.role === 'peer' ? 'portfolio-list' : currentUser.role === 'admin' ? 'admin-view' : 'teacher-dashboard';
  const selectedSnapshot = currentPortfolio?.versions.find(item => item.versionNumber === selectedVersion);
  const integrityError = Boolean(currentPortfolio && selectedVersion && !selectedSnapshot);
  const activeResponse = selectedSnapshot?.responses?.[activeAxisId];

  useEffect(() => {
    const reset = Object.fromEntries((activeRubric.criteria || []).map(criterion => [criterion.id, 0]));
    if (!currentPortfolio || !assignment || !selectedVersion || !selectedSnapshot) {
      setRubricScores(reset);
      setOverallFeedback('');
      return;
    }
    const existing = rubricSubmissions.find(item =>
      item.studentId === currentPortfolio.studentId &&
      item.assignmentId === assignment.id &&
      item.versionNumber === selectedVersion &&
      item.evaluatorRole === evaluatorRole
    );
    if (existing) {
      const loaded: Record<string, number> = {};
      for (const [criterionId, value] of Object.entries(existing.criterionScores || {})) {
        loaded[criterionId] = Number(value.level || value.score || 0);
      }
      setRubricScores(loaded);
      setOverallFeedback(existing.overallFeedback || '');
    } else {
      setRubricScores(reset);
      setOverallFeedback('');
    }
  }, [currentPortfolio, assignment, selectedVersion, selectedSnapshot, evaluatorRole, activeRubric.id, activeRubric.criteria, rubricSubmissions]);

  const currentFeedbacks = useMemo(() => {
    if (!currentPortfolio || !assignment || !selectedVersion) return [];
    return feedbacks.filter(item =>
      item.studentId === currentPortfolio.studentId &&
      item.assignmentId === assignment.id &&
      item.axisId === activeAxisId &&
      item.versionNumber === selectedVersion
    );
  }, [feedbacks, currentPortfolio, assignment, activeAxisId, selectedVersion]);

  const pendingAiProposal = useMemo(() => {
    if (!currentPortfolio || !selectedVersion || evaluatorRole !== 'teacher') return null;
    return aiReviews.find(item =>
      item.student_id === currentPortfolio.studentId &&
      item.version_number === selectedVersion &&
      item.status === 'completed' &&
      item.teacher_review_status === 'pending'
    ) || null;
  }, [aiReviews, currentPortfolio, selectedVersion, evaluatorRole]);

  useEffect(() => {
    setEditedAiText(pendingAiProposal?.response || '');
    setIsEditingAiProposal(false);
  }, [pendingAiProposal?.id, pendingAiProposal?.response]);

  const currentReflection = useMemo(() => {
    if (!currentPortfolio || !assignment || !selectedSnapshot) return null;
    return reflections.find(r =>
      r.studentId === currentPortfolio.studentId &&
      r.assignmentId === assignment.id &&
      r.versionId === selectedSnapshot.id
    ) || null;
  }, [reflections, currentPortfolio, assignment, selectedSnapshot]);

  const currentRubricSubmission = useMemo(() => {
    if (!currentPortfolio || !assignment || !selectedVersion) return null;
    return rubricSubmissions.find(item =>
      item.studentId === currentPortfolio.studentId &&
      item.assignmentId === assignment.id &&
      item.versionNumber === selectedVersion &&
      item.evaluatorRole === evaluatorRole
    ) || null;
  }, [rubricSubmissions, currentPortfolio, assignment, selectedVersion, evaluatorRole]);

  const totalScore = activeRubric.criteria.reduce((sum, criterion) => {
    const selectedLevel = rubricScores[criterion.id] || 0;
    const level = criterion.levels.find(item => item.level === selectedLevel);
    return sum + Number(level?.score || 0) * Number(criterion.weight || 1);
  }, 0);
  const maxScore = activeRubric.criteria.reduce((sum, criterion) => {
    const max = criterion.levels.reduce((current, level) => Math.max(current, Number(level.score || 0)), 0);
    return sum + max * Number(criterion.weight || 1);
  }, 0);

  const filteredQueue = useMemo(() => queue.filter(item => {
    const matchQuery = !searchQuery.trim() ||
      item.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.className && item.className.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchQuery) return false;

    if (filterState === 'all') return true;
    const hasRubric = rubricSubmissions.some(r =>
      r.studentId === item.studentId &&
      r.assignmentId === item.assignmentId &&
      r.evaluatorRole === evaluatorRole
    );
    if (filterState === 'graded') return hasRubric;
    if (filterState === 'pending') return !hasRubric;
    return true;
  }), [queue, searchQuery, filterState, rubricSubmissions, evaluatorRole]);

  const visibleQueueIndex = currentPortfolio
    ? filteredQueue.findIndex(item => item.id === currentPortfolio.id)
    : -1;

  useEffect(() => {
    if (!filteredQueue.length || visibleQueueIndex >= 0) return;
    const firstVisibleIndex = queue.findIndex(item => item.id === filteredQueue[0].id);
    if (firstVisibleIndex >= 0) {
      setCurrentIndex(firstVisibleIndex);
      setSelectedText('');
    }
  }, [filteredQueue, visibleQueueIndex, queue]);

  const changeStudent = (offset: number) => {
    if (visibleQueueIndex < 0) return;
    const nextItem = filteredQueue[visibleQueueIndex + offset];
    if (!nextItem) return;
    const nextIndex = queue.findIndex(item => item.id === nextItem.id);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      setSelectedText('');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.altKey && (e.key === '[' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        changeStudent(-1);
      } else if (e.altKey && (e.key === ']' || e.key === 'ArrowRight')) {
        e.preventDefault();
        changeStudent(1);
      } else if (e.altKey && !isNaN(Number(e.key))) {
        const num = Number(e.key);
        if (num >= 1 && num <= 6) {
          e.preventDefault();
          const targetAxis = POETIC_AXES[num - 1];
          if (targetAxis) setActiveAxisId(targetAxis.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (isLoading && queue.length === 0) return <StatePanel loading title="Đang mở bài chấm" message="Đang tải các phiên bản đã nộp..." />;
  if (dataError && queue.length === 0) return <StatePanel title="Không thể tải dữ liệu" message={dataError} actionLabel="Thử lại" onAction={() => void refreshAcademicData()} />;
  if (assignmentId && queue.length === 0) return <StatePanel title="Chưa có bài đã nộp" message="Nhiệm vụ này chưa có phiên bản nào thuộc phạm vi bạn được phép chấm." actionLabel="Về trang chính" onAction={() => onNavigate(reviewHome)} />;
  if (requestedStudentMissing) return <StatePanel title="Không tìm thấy bài của học sinh" message="Học sinh được yêu cầu không có bài thuộc phạm vi bạn được phép chấm." actionLabel="Về trang chính" onAction={() => onNavigate(reviewHome)} />;
  if (!queue.length) return <StatePanel title="Chưa có bài để chấm" message="Khi học sinh nộp phiên bản, bài sẽ xuất hiện tại đây." actionLabel="Về trang chính" onAction={() => onNavigate(reviewHome)} />;
  if (!currentPortfolio || !assignment) return <StatePanel title="Dữ liệu chưa hoàn chỉnh" message="Hồ sơ không còn liên kết với nhiệm vụ hợp lệ." actionLabel="Tải lại" onAction={() => void refreshAcademicData()} />;
  if (!selectedSnapshot || integrityError) return <StatePanel title="Không tìm thấy phiên bản đã nộp" message="Không thể chấm bằng bản nháp thay thế. Hãy tải lại dữ liệu hoặc chọn một phiên bản hợp lệ." actionLabel="Tải lại" onAction={() => void refreshAcademicData()} />;

  const createFeedback = async () => {
    if (isAdminReadOnly) return;
    const comment = feedbackText.trim();
    if (!comment) {
      addToast({ type: 'warning', title: 'Chưa có nội dung phản hồi', message: 'Hãy nhập nhận xét trước khi gửi.' });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await addAnchoredFeedback({
        assignmentId: assignment.id,
        studentId: currentPortfolio.studentId,
        versionId: selectedSnapshot.id,
        versionNumber: selectedSnapshot.versionNumber,
        axisId: activeAxisId,
        selectedSnippet: selectedText,
        comment,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: evaluatorRole
      });
      setFeedbackText('');
      setSelectedText('');
      addToast({ type: 'success', title: 'Đã lưu phản hồi', message: 'Nhận xét đã được lưu cho đúng phiên bản.' });
    } catch (error: unknown) {
      addToast({ type: 'error', title: 'Lỗi gửi phản hồi', message: error instanceof Error ? error.message : 'Không thể lưu nhận xét.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const saveRubric = async () => {
    if (isAdminReadOnly) return;
    if (!activeRubric.criteria.length) return;
    if (activeRubric.criteria.some(criterion => (rubricScores[criterion.id] || 0) < 1)) {
      addToast({ type: 'warning', title: 'Rubric chưa hoàn tất', message: 'Hãy chọn mức cho tất cả tiêu chí.' });
      return;
    }
    setIsSubmittingRubric(true);
    try {
      const criterionScores = Object.fromEntries(activeRubric.criteria.map(criterion => {
        const level = rubricScores[criterion.id] || 0;
        return [criterion.id, { level, score: level, note: '' }];
      }));
      const result = await submitRubric({
        assignmentId: assignment.id,
        studentId: currentPortfolio.studentId,
        versionId: selectedSnapshot.id,
        versionNumber: selectedSnapshot.versionNumber,
        evaluatorId: currentUser.id,
        evaluatorName: currentUser.name,
        evaluatorRole,
        criterionScores,
        overallFeedback: overallFeedback.trim(),
        totalScore,
        maxScore
      });
      const canonicalTotal = result.totalScore ?? totalScore;
      const canonicalMax = result.maxScore ?? maxScore;
      addToast({ type: 'success', title: 'Đã lưu điểm rubric', message: `Đã lưu điểm ${canonicalTotal}/${canonicalMax}.` });
    } catch (error: unknown) {
      addToast({ type: 'error', title: 'Lỗi lưu rubric', message: error instanceof Error ? error.message : 'Không thể lưu kết quả rubric.' });
    } finally {
      setIsSubmittingRubric(false);
    }
  };

  const handleTeacherAiDecision = async (decision: 'approved' | 'revised' | 'rejected') => {
    if (isAdminReadOnly || !pendingAiProposal) return;
    setIsSubmittingAiReview(true);
    try {
      const finalResponse = decision === 'revised' ? editedAiText.trim() : '';
      const response = await fetch('/api/academic/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'teacher_review_ai',
          reviewId: pendingAiProposal.id,
          decision,
          finalResponse,
          axisId: activeAxisId,
          teacherNote: decision === 'revised' ? 'Giáo viên chỉnh góp ý AI' : decision === 'rejected' ? 'Giáo viên không sử dụng góp ý AI' : 'Giáo viên đã xem góp ý AI'
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.code || 'Không thể cập nhật góp ý AI');
      await refreshAcademicData();
      addToast({
        type: 'success',
        title: decision === 'revised' ? 'Đã lưu bổ sung của giáo viên' : 'Đã cập nhật góp ý AI',
        message: decision === 'revised' ? 'Học sinh sẽ thấy phần bổ sung của giáo viên cùng góp ý AI.' : 'Đã cập nhật trạng thái góp ý AI.'
      });
    } catch (error: unknown) {
      addToast({ type: 'error', title: 'Không thể cập nhật góp ý AI', message: error instanceof Error ? error.message : 'Vui lòng thử lại.' });
    } finally {
      setIsSubmittingAiReview(false);
    }
  };

  const captureSelection = () => {
    const text = window.getSelection()?.toString().trim() || '';
    if (text.length >= 5) setSelectedText(text.slice(0, 1000));
  };

  const attachSnippetToComment = () => setActiveTab('comment');

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => onNavigate(reviewHome)} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Quay lại
            </Button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <strong className="truncate text-base font-bold text-slate-900">{currentPortfolio.studentName}</strong>
                <Badge size="sm" variant="outline">Lớp {currentPortfolio.className || '—'}</Badge>
                <Badge size="sm" variant="primary">{selectedSnapshot.versionNumber}</Badge>
                {currentRubricSubmission ? <Badge size="sm" variant="emerald">Đã chấm: {currentRubricSubmission.totalScore}/{currentRubricSubmission.maxScore}đ</Badge> : <Badge size="sm" variant="amber">Chưa chấm Rubric</Badge>}
                {pendingAiProposal && evaluatorRole === 'teacher' && <Badge size="sm" variant="blue">Có góp ý AI</Badge>}{isAdminReadOnly && <Badge size="sm" variant="outline">Chỉ xem</Badge>}
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">{assignment.title}{literatureText ? ` · ${literatureText.title}` : ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 mr-2">
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Alt+[</kbd><span>/</span><kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Alt+]</kbd>
            </div>
            <Button size="sm" variant="outline" disabled={visibleQueueIndex <= 0} onClick={() => changeStudent(-1)} leftIcon={<ChevronLeftIcon className="h-4 w-4" />}>
              Học sinh trước
            </Button>
            <span className="min-w-16 text-center text-xs font-semibold text-slate-600">{visibleQueueIndex >= 0 ? visibleQueueIndex + 1 : 0} / {filteredQueue.length}</span>
            <Button size="sm" variant="outline" disabled={visibleQueueIndex < 0 || visibleQueueIndex >= filteredQueue.length - 1} onClick={() => changeStudent(1)} rightIcon={<ChevronRightIcon className="h-4 w-4" />}>
              Học sinh tiếp
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[100rem] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_390px]">
        <aside className="space-y-3.5 border-b border-slate-200 bg-slate-50/75 p-3.5 lg:border-b-0 lg:border-r lg:p-4">
          <div>
            <label className="block space-y-1.5 text-xs font-bold text-slate-500">
              <span>Phiên bản chấm</span>
              <select value={selectedVersion} onChange={event => setSelectedVersion(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-800 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10">
                {currentPortfolio.versions.map(version => <option key={version.id} value={version.versionNumber}>{version.versionNumber} · {version.stage === 'prediction' ? 'Dự đoán' : version.stage === 'initial' ? 'Bản đầu' : 'Bản chỉnh sửa'}</option>)}
              </select>
            </label>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Danh sách học sinh</span><Badge size="sm" variant="outline">{filteredQueue.length}</Badge></div>
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Tìm học sinh..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500" />
            </div>
            <div className="mb-2 flex gap-1 rounded-md border border-slate-200 bg-white p-0.5 text-xs">
              <button type="button" onClick={() => setFilterState('all')} className={`flex-1 rounded py-1 font-medium transition ${filterState === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Tất cả</button>
              <button type="button" onClick={() => setFilterState('pending')} className={`flex-1 rounded py-1 font-medium transition ${filterState === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Chờ chấm</button>
              <button type="button" onClick={() => setFilterState('graded')} className={`flex-1 rounded py-1 font-medium transition ${filterState === 'graded' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>Đã chấm</button>
            </div>

            <div className="max-h-[58vh] space-y-1 overflow-y-auto pr-0.5">
              {filteredQueue.length === 0 ? <p className="p-3 text-center text-xs text-slate-400">Không tìm thấy học sinh phù hợp.</p> : filteredQueue.map(item => {
                const actualIndex = queue.findIndex(q => q.id === item.id);
                const active = actualIndex === currentIndex;
                const isGraded = rubricSubmissions.some(r => r.studentId === item.studentId && r.assignmentId === item.assignmentId && r.evaluatorRole === evaluatorRole);
                return (
                  <button key={item.id} type="button" onClick={() => { setCurrentIndex(actualIndex); setSelectedText(''); }} aria-current={active ? 'true' : undefined} className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${active ? 'border-primary-300 bg-primary-50/90 font-semibold text-primary-950' : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'}`}>
                    <div className="flex items-center justify-between gap-1"><span className="truncate">{item.studentName}</span>{isGraded ? <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" title="Đã chấm Rubric" /> : <ClockIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" title="Chưa chấm" />}</div>
                    <div className={`mt-0.5 text-xs ${active ? 'text-primary-700' : 'text-slate-400'}`}>Lớp {item.className || '—'} · {item.versions[item.versions.length - 1]?.versionNumber}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-7">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px" role="tablist" aria-label="Trục thi pháp">
            {POETIC_AXES.map((axis, index) => {
              const resp = selectedSnapshot?.responses?.[axis.id];
              const hasText = Boolean(resp?.analysisText?.trim());
              const axisFeedbacks = feedbacks.filter(f => f.studentId === currentPortfolio.studentId && f.assignmentId === assignment.id && f.axisId === axis.id && f.versionNumber === selectedVersion);
              const isCurrent = activeAxisId === axis.id;
              return (
                <button key={axis.id} type="button" role="tab" aria-selected={isCurrent} onClick={() => setActiveAxisId(axis.id)} className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${isCurrent ? 'border-primary-700 text-primary-900 font-semibold' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>
                  <span className="text-xs font-mono text-slate-400">{index + 1}.</span><span>{axis.shortName}</span>{hasText && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Có nội dung" />}{axisFeedbacks.length > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-xs font-bold text-amber-800">{axisFeedbacks.length}</span>}
                </button>
              );
            })}
          </div>

          {pendingAiProposal && evaluatorRole === 'teacher' && (
            <section className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-bold text-sky-700">Lịch sử AI</div><h3 className="mt-0.5 text-sm font-bold text-slate-900">Góp ý AI đã gửi học sinh</h3></div><Badge variant="blue">Chờ giáo viên xem</Badge></div>
              {isEditingAiProposal ? <textarea rows={5} value={editedAiText} onChange={event => setEditedAiText(event.target.value)} placeholder="Nhập nội dung bổ sung hoặc sửa đổi..." className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10" /> : <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 bg-white/70 p-3 rounded-lg border border-sky-100">{pendingAiProposal.response}</p>}
              <p className="text-xs leading-5 text-slate-500">Học sinh đã thấy góp ý này. Giáo viên có thể lưu một phần bổ sung riêng mà không ghi đè lịch sử AI.</p>
              {!isAdminReadOnly && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="primary" isLoading={isSubmittingAiReview} onClick={() => handleTeacherAiDecision(isEditingAiProposal ? 'revised' : 'approved')}>{isEditingAiProposal ? 'Gửi bổ sung của giáo viên' : 'Đã xem góp ý AI'}</Button>
                  {!isEditingAiProposal && <Button size="sm" variant="outline" onClick={() => setIsEditingAiProposal(true)}>Chỉnh sửa và bổ sung</Button>}
                  {isEditingAiProposal && <Button size="sm" variant="ghost" onClick={() => { setEditedAiText(pendingAiProposal.response || ''); setIsEditingAiProposal(false); }}>Hủy sửa</Button>}
                  <Button size="sm" variant="ghost" isLoading={isSubmittingAiReview} onClick={() => handleTeacherAiDecision('rejected')}>Không sử dụng</Button>
                </div>
              )}
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3"><div><div className="text-xs font-bold text-slate-400">Phiên bản đã nộp</div><h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">{POETIC_AXES.find(axis => axis.id === activeAxisId)?.title}</h2></div><div className="flex items-center gap-2"><Badge variant="outline">{selectedSnapshot.versionNumber}</Badge><span className="text-xs text-slate-400">{activeResponse?.analysisText ? `${activeResponse.analysisText.trim().split(/\s+/).length} từ` : '0 từ'}</span></div></div>
            {selectedText && !isAdminReadOnly && <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50/80 px-3.5 py-2 text-xs"><div className="truncate text-primary-900"><span className="font-semibold">Đã chọn đoạn:</span> &ldquo;{selectedText.slice(0, 70)}{selectedText.length > 70 ? '...' : ''}&rdquo;</div><div className="flex items-center gap-1.5 shrink-0 ml-2"><Button size="sm" variant="primary" onClick={attachSnippetToComment} leftIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}>Gắn nhận xét</Button><Button size="sm" variant="ghost" onClick={() => setSelectedText('')}>Bỏ chọn</Button></div></div>}
            <div onMouseUp={captureSelection} className="min-h-64 select-text whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-5 text-[15px] leading-8 text-slate-800 selection:bg-primary-100 selection:text-primary-900">{activeResponse?.analysisText?.trim() || <span className="italic text-slate-400">Học sinh chưa viết nội dung ở trục này.</span>}</div>
            {activeResponse?.evidenceQuotes && activeResponse.evidenceQuotes.length > 0 && <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-4"><div className="text-xs font-bold text-slate-500">Dẫn chứng học sinh ({activeResponse.evidenceQuotes.length})</div><div className="space-y-2">{activeResponse.evidenceQuotes.map(item => <blockquote key={item.id} className="rounded-md border-l-3 border-primary-400 bg-white p-3 text-xs italic leading-relaxed text-slate-700">&ldquo;{item.text}&rdquo;</blockquote>)}</div></div>}
          </section>

          {currentFeedbacks.length > 0 && <section className="space-y-3 border-t border-slate-200 pt-5"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-800">Nhận xét ở trục này ({currentFeedbacks.length})</h3></div><div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">{currentFeedbacks.map(item => <div key={item.id} className="space-y-1.5 p-3.5 text-xs"><div className="flex items-center justify-between"><strong className="font-semibold text-slate-800">{item.authorName}</strong><Badge size="sm" variant={item.authorRole === 'teacher' ? 'primary' : 'outline'}>{item.authorRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}</Badge></div>{item.selectedSnippet && <div className="rounded border-l-2 border-slate-300 bg-slate-50 p-2 italic text-slate-600">&ldquo;{item.selectedSnippet}&rdquo;</div>}<p className="leading-relaxed text-slate-800">{item.comment}</p></div>)}</div></section>}
        </main>

        <aside className="space-y-4 border-t border-slate-200 bg-slate-50/60 p-4 lg:border-l lg:border-t-0 lg:p-5">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <button type="button" onClick={() => setActiveTab('comment')} className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${activeTab === 'comment' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><ChatBubbleLeftRightIcon className="h-3.5 w-3.5" /><span>Nhận xét</span></button>
            <button type="button" onClick={() => setActiveTab('rubric')} className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${activeTab === 'rubric' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><DocumentCheckIcon className="h-3.5 w-3.5" /><span>Rubric ({totalScore}/{maxScore})</span></button>
            <button type="button" onClick={() => setActiveTab('ai')} className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${activeTab === 'ai' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><SparklesIcon className="h-3.5 w-3.5" /><span>AI</span></button>
            <button type="button" onClick={() => setActiveTab('reflection')} className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 font-medium transition ${activeTab === 'reflection' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}><BookOpenIcon className="h-3.5 w-3.5" /><span>REF1</span></button>
          </div>

          {activeTab === 'comment' && <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div><h3 className="text-sm font-bold text-slate-900">Nhận xét trực tiếp</h3><p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{isAdminReadOnly ? 'Quản trị viên đang xem bài ở chế độ chỉ đọc.' : 'Bôi đen một đoạn để gắn nhận xét, hoặc nhập nhận xét chung cho trục này.'}</p></div>{selectedText ? <div className="rounded-lg border-l-2 border-primary-400 bg-primary-50/70 p-2.5 text-xs italic leading-relaxed text-slate-700"><div className="flex items-center justify-between font-semibold not-italic text-primary-900 mb-1"><span>Đoạn trích gắn kèm</span><button type="button" onClick={() => setSelectedText('')} className="text-slate-400 hover:text-slate-600">×</button></div>&ldquo;{selectedText}&rdquo;</div> : <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center text-xs text-slate-400">Chưa chọn đoạn trích (nhận xét sẽ gắn vào toàn trục)</div>}<div><textarea rows={5} value={feedbackText} onChange={event => setFeedbackText(event.target.value)} disabled={isAdminReadOnly} placeholder={isAdminReadOnly ? 'Chế độ chỉ đọc' : 'Nhập nhận xét cho học sinh...'} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10" /></div>{!isAdminReadOnly && <Button className="w-full" size="sm" variant="primary" isLoading={isSubmittingFeedback} onClick={createFeedback}>Gửi nhận xét</Button>}</section>}

          {activeTab === 'rubric' && <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3"><div><h3 className="text-sm font-bold text-slate-900">{activeRubric.title || 'Rubric đánh giá'}</h3><p className="mt-0.5 text-xs text-slate-500">Chọn đủ mức cho 6 tiêu chí trước khi lưu.</p></div><div className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">{totalScore}/{maxScore}đ</div></div>{!activeRubric.criteria.length ? <p className="text-xs text-slate-500">Nhiệm vụ chưa có rubric hợp lệ.</p> : <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">{activeRubric.criteria.map((criterion, idx) => { const currentLevel = rubricScores[criterion.id] || 0; return <div key={criterion.id} className="space-y-2 border-b border-slate-100 pb-3 last:border-0"><div className="flex items-center justify-between"><span className="text-xs font-semibold leading-5 text-slate-800">{idx + 1}. {criterion.title}</span>{currentLevel > 0 ? <span className="text-xs font-bold text-primary-700">Mức {currentLevel}</span> : <span className="text-xs text-amber-600 font-medium">Chưa chọn</span>}</div><div className="grid grid-cols-4 gap-1.5">{criterion.levels.map(level => { const isSelected = currentLevel === level.level; return <button key={level.level} type="button" title={`${criterion.title}: mức ${level.level} - ${level.label}`} disabled={isAdminReadOnly} onClick={() => setRubricScores(previous => ({ ...previous, [criterion.id]: level.level }))} className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-xs transition ${isSelected ? 'border-primary-700 bg-primary-700 text-white font-bold' : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50'}`}><span className="font-bold">M{level.level}</span><span className={`text-xs truncate max-w-full ${isSelected ? 'text-primary-100' : 'text-slate-400'}`}>{level.score}đ</span></button>; })}</div></div>; })}</div>}<div><label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét tổng kết toàn bài</label><textarea rows={3} value={overallFeedback} onChange={event => setOverallFeedback(event.target.value)} disabled={isAdminReadOnly} placeholder={isAdminReadOnly ? 'Chế độ chỉ đọc' : 'Nhập nhận xét tổng kết...'} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs leading-relaxed outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10" /></div>{!isAdminReadOnly && <Button className="w-full" size="sm" variant="primary" disabled={!activeRubric.criteria.length} isLoading={isSubmittingRubric} onClick={saveRubric}>Lưu điểm Rubric</Button>}</section>}

          {activeTab === 'ai' && <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Góp ý AI</h3>{pendingAiProposal ? <Badge variant="blue">Chờ duyệt</Badge> : <Badge variant="outline">Đã gửi / Không có</Badge>}</div>{pendingAiProposal ? <div className="space-y-3 text-xs"><div className="rounded-lg bg-sky-50 border border-sky-200 p-3 leading-relaxed text-slate-800"><div className="font-semibold text-sky-900 mb-1">Góp ý AI:</div><p className="whitespace-pre-wrap">{pendingAiProposal.response}</p></div>{!isAdminReadOnly && <Button size="sm" variant="primary" className="w-full" onClick={() => handleTeacherAiDecision('approved')}>Đã xem góp ý AI</Button>}</div> : <p className="text-xs text-slate-500 leading-relaxed">Không có góp ý AI nào đang chờ giáo viên xem.</p>}</section>}

          {activeTab === 'reflection' && <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Phiếu tự phản tư (REF1)</h3>{currentReflection ? <Badge variant="emerald">Đã nộp REF1</Badge> : <Badge variant="amber">Chưa nộp REF1</Badge>}</div>{currentReflection ? <div className="space-y-3 text-xs leading-relaxed max-h-[50vh] overflow-y-auto pr-1"><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"><span className="font-semibold text-slate-800 block">1. Nhận thức thay đổi thế nào sau V1:</span><p className="text-slate-600">{currentReflection.reflection.changedUnderstanding || '—'}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"><span className="font-semibold text-slate-800 block">2. Góp ý hữu ích nhất:</span><p className="text-slate-600">{currentReflection.reflection.mostUsefulFeedback || '—'}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"><span className="font-semibold text-slate-800 block">3. Điểm chưa đạt ở V1:</span><p className="text-slate-600">{currentReflection.reflection.incompleteInV1 || '—'}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"><span className="font-semibold text-slate-800 block">4. Điểm tiến bộ ở V2:</span><p className="text-slate-600">{currentReflection.reflection.improvedInV2 || '—'}</p></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-1"><span className="font-semibold text-slate-800 block">5. Vận dụng cho bài đọc sau:</span><p className="text-slate-600">{currentReflection.reflection.transferToNextReading || '—'}</p></div></div> : <p className="text-xs text-slate-500 leading-relaxed">Học sinh chưa hoàn thành phiếu REF1 cho phiên bản đang chấm. Theo quy trình, học sinh cần tự phản tư sau V2 trước khi nhận điểm chính thức.</p>}</section>}

          {literatureText && <div className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">Ngữ liệu: <strong className="font-semibold text-slate-700">{literatureText.title}</strong> · {literatureText.author}</div>}
        </aside>
      </div>
    </div>
  );
};

