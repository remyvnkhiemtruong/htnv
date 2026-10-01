import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../app/store/useAuthStore';
import { usePortfolioStore } from '../app/store/usePortfolioStore';
import { deriveStudentWorkflow } from '../app/workflow/workflowState';
import { useNotificationStore } from '../app/store/useNotificationStore';
import {
  studentAcademicKeys,
  useStudentAcademicAction,
  useStudentWorkspaceQuery
} from '../app/queries/studentAcademicQueries';
import { POETIC_AXES } from '../data/seedData';
import type { EvidenceQuote, PoeticAxisId } from '../types';
import { Badge, Button, SkeletonEditor } from '../components/ui';
import { CreateVersionModal } from '../components/versioning/CreateVersionModal';
import { clearDraftRecovery, getDraftRecovery } from '../app/offline/draftRecovery';
import {
  ArrowLeftIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  BookmarkSquareIcon,
  PlusIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface PortfolioEditorViewProps {
  assignmentId: string;
  onNavigate: (view: string, extraParams?: any) => void;
}

const nextSubmissionVersion = (versions: { stage?: string; versionNumber: string }[]) => {
  const submitted = versions.filter(item => item.stage !== 'prediction');
  return `V${submitted.length + 1}`;
};

const StatePanel: React.FC<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, message, actionLabel, onAction }) => (
  <div className="mx-auto mt-16 max-w-md space-y-3 p-6 text-center">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    <p className="text-sm leading-relaxed text-slate-500">{message}</p>
    {actionLabel && onAction && <div className="pt-2"><Button variant="primary" onClick={onAction}>{actionLabel}</Button></div>}
  </div>
);

const emptyReflection = {
  changedUnderstanding: '',
  mostUsefulFeedback: '',
  incompleteInV1: '',
  improvedInV2: '',
  transferToNextReading: ''
};

export const PortfolioEditorView: React.FC<PortfolioEditorViewProps> = ({ assignmentId, onNavigate }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const queryClient = useQueryClient();
  const workspaceQuery = useStudentWorkspaceQuery(
    assignmentId,
    currentUser.role === 'student' && Boolean(currentUser.id)
  );
  const studentAction = useStudentAcademicAction(assignmentId);
  const workspace = workspaceQuery.data;
  const feedbacks = workspace?.feedbacks || [];
  const reflections = workspace?.reflections || [];
  const rubricSubmissions = workspace?.rubricSubmissions || [];
  const isLoading = workspaceQuery.isLoading;
  const dataError = workspaceQuery.error instanceof Error ? workspaceQuery.error.message : null;
  const {
    portfolios,
    hydratePortfolios,
    updateDraft,
    manualSaveDraft,
    createSnapshot,
    autosaveStatus,
    lastSavedTime,
    lastSaveError
  } = usePortfolioStore();
  const { addToast } = useNotificationStore();

  useEffect(() => {
    if (!workspace?.portfolio) return;
    hydratePortfolios({ [workspace.portfolio.id]: workspace.portfolio });
  }, [hydratePortfolios, workspace?.portfolio]);

  const [activeAxisId, setActiveAxisId] = useState<PoeticAxisId>('plot_situation');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isPredictionMode, setIsPredictionMode] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'sm' | 'base' | 'lg'>('base');
  const [reflectionForm, setReflectionForm] = useState(emptyReflection);
  const [isSavingReflection, setIsSavingReflection] = useState(false);
  const [selectedQuoteSnippet, setSelectedQuoteSnippet] = useState('');
  const [localBackupAvailable, setLocalBackupAvailable] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const analysisTextareaRef = useRef<HTMLTextAreaElement>(null);

  // V4 Layout states
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'prompt' | 'text' | 'evidence' | 'feedback' | 'history'>('prompt');
  const [mobileTab, setMobileTab] = useState<'write' | 'evidence' | 'feedback' | 'prompt'>('write');
  const selectMobileTab = (tab: 'write' | 'evidence' | 'feedback' | 'prompt') => {
    setMobileTab(tab);
    if (tab !== 'write') setInspectorTab(tab);
  };

  const editorFontSizeClass = {
    sm: 'text-sm leading-6',
    base: 'text-base leading-7 sm:text-[15px]',
    lg: 'text-lg leading-8 sm:text-base'
  }[fontSizeLevel];

  const assignment = workspace?.assignment;
  const portfolioKey = assignment && currentUser.id ? `port-${currentUser.id}-${assignment.id}` : '';
  const portfolio = portfolioKey ? (portfolios[portfolioKey] || workspace?.portfolio) : workspace?.portfolio;
  const literatureText = workspace?.literatureText || undefined;
  const primaryTextAvailable = Boolean(literatureText?.fullContent?.trim() || literatureText?.excerpt?.trim());
  const predictionQuestions = (assignment?.predictionTemplate?.questions || []).filter(question => Boolean(question?.trim()));
  const predictionPrompt = assignment?.predictionTemplate?.prompt?.trim() || '';
  const readingGuide = assignment?.predictionTemplate?.readingGuide?.trim() || '';
  const readingSources = (assignment?.predictionTemplate?.readingSources || []).filter(source =>
    source?.label?.trim() && /^https:\/\//i.test(source?.url || '')
  );

  const currentAxis = portfolio?.currentDraft?.[activeAxisId];
  const axisFeedbacks = useMemo(
    () => assignment ? feedbacks.filter(item => item.assignmentId === assignment.id && item.studentId === currentUser.id && item.axisId === activeAxisId) : [],
    [assignment, feedbacks, currentUser.id, activeAxisId]
  );
  const allStudentFeedbacks = useMemo(
    () => assignment ? feedbacks.filter(item => item.assignmentId === assignment.id && item.studentId === currentUser.id) : [],
    [assignment, feedbacks, currentUser.id]
  );
  const wordCount = useMemo(() => {
    if (!portfolio) return 0;
    return Object.values(portfolio.currentDraft || {}).reduce((sum, response) => {
      const words = String(response?.analysisText || '').trim().split(/\s+/).filter(Boolean).length;
      return sum + words;
    }, 0);
  }, [portfolio]);

  const evidenceText = (currentAxis?.evidenceQuotes || []).map(item => typeof item === 'string' ? item : item?.text || '').filter(Boolean).join('\n');
  const versions = portfolio?.versions || [];
  const submittedVersions = versions.filter(item => item.stage !== 'prediction');
  const predictionVersion = versions.find(item => item.stage === 'prediction');
  const isInitial = submittedVersions.length === 0;
  const predictionAvailable = !predictionVersion && isInitial && assignment?.workflowConfig?.predictionEnabled !== false;
  const nextVersion = isPredictionMode ? 'V0' : nextSubmissionVersion(versions);
  const latestRevision = [...versions].reverse().find(item => item.stage === 'revision');
  const latestReflection = latestRevision && assignment
    ? reflections.find(item => item.assignmentId === assignment.id && item.studentId === currentUser.id && item.versionId === latestRevision.id)
    : undefined;
  const workflowState = assignment ? deriveStudentWorkflow({
    assignment,
    portfolio,
    feedbacks,
    rubricSubmissions,
    reflectionVersionIds: reflections
      .filter(item => item.assignmentId === assignment.id && item.studentId === currentUser.id)
      .map(item => item.versionId)
  }) : null;
  const currentAxisMeta = POETIC_AXES.find(axis => axis.id === activeAxisId) || POETIC_AXES[0];
  const completedAxes = POETIC_AXES.filter(axis => Boolean(portfolio?.currentDraft?.[axis.id]?.analysisText?.trim())).length;

  const updateAnalysis = (text: string) => {
    if (!assignment || !workflowState?.canEdit) return;
    updateDraft(currentUser.id, assignment.id, activeAxisId, text, currentAxis?.evidenceQuotes || []);
  };
  const updateEvidence = (text: string) => {
    if (!assignment || !workflowState?.canEdit) return;
    const quotes: EvidenceQuote[] = text.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => ({ id: `${activeAxisId}-${index + 1}`, text: line }));
    updateDraft(currentUser.id, assignment.id, activeAxisId, currentAxis?.analysisText || '', quotes);
  };
  const saveNow = React.useCallback(async () => {
    if (!assignment || !workflowState?.canEdit) return;
    try {
      await manualSaveDraft(currentUser.id, assignment.id);
      addToast({ type: 'success', title: 'Đã lưu', message: 'Bản nháp đã được lưu thành công.' });
    } catch {
      addToast({ type: 'error', title: 'Chưa lưu được', message: 'Kiểm tra kết nối và thử lại.' });
    }
  }, [assignment, currentUser.id, manualSaveDraft, addToast, workflowState?.canEdit]);

  const handleConfirmSubmit = async (data: {
    changeSummary: string;
    revisionReason: string;
    linkedFeedbackIds: string[];
    changeSource: string;
    confidence: number;
    stage?: 'prediction' | 'initial' | 'revision';
  }) => {
    if (!assignment || !workflowState?.canEdit) throw new Error('PORTFOLIO_READ_ONLY');
    const ok = await createSnapshot(currentUser.id, assignment.id, nextVersion, data.changeSummary, currentUser.name, {
      submissionKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined,
      stage: data.stage,
      confidence: data.confidence,
      changeSource: data.changeSource,
      revisionReason: data.revisionReason,
      linkedFeedbackIds: data.linkedFeedbackIds
    });
    if (!ok) throw new Error('CREATE_VERSION_FAILED');
    await Promise.all([
      workspaceQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: studentAcademicKeys.overview() })
    ]);
    addToast({ type: 'success', title: `Đã nộp ${nextVersion}`, message: isPredictionMode ? 'V0 đã được khóa làm mốc dự đoán trước đọc.' : 'Bài viết đã được gửi vào hàng đợi phản hồi AI.' });
  };

  const submitReflection = async () => {
    if (!latestRevision || !assignment) return;
    if (Object.values(reflectionForm).some(value => !value.trim())) {
      addToast({ type: 'warning', title: 'Chưa hoàn tất tự phản tư', message: 'Hãy trả lời đủ 5 câu trước khi gửi REF1.' });
      return;
    }
    setIsSavingReflection(true);
    try {
      await studentAction.mutateAsync({
        action: 'save_reflection',
        assignmentId: assignment.id,
        versionId: latestRevision.id,
        reflection: reflectionForm
      });
      setReflectionForm(emptyReflection);
      addToast({ type: 'success', title: 'Đã lưu REF1', message: 'Đã lưu tự phản tư cho phiên bản này.' });
    } catch (error: unknown) {
      addToast({ type: 'error', title: 'Không thể lưu tự phản tư', message: error instanceof Error ? error.message : 'Vui lòng thử lại.' });
    } finally {
      setIsSavingReflection(false);
    }
  };

  // IndexedDB recovery: every local edit is persisted by the portfolio store.
  useEffect(() => {
    if (!assignment || !currentUser.id || !portfolio || !workflowState?.canEdit) return;
    let active = true;
    void getDraftRecovery(currentUser.id, assignment.id).then(recovery => {
      if (!active || !recovery?.draft) return;
      const currentLen = Object.values(portfolio.currentDraft || {}).reduce((sum, axis) => sum + (axis?.analysisText?.length || 0), 0);
      const recoveryLen = Object.values(recovery.draft || {}).reduce((sum, axis) => sum + (axis?.analysisText?.length || 0), 0);
      const newerThanServer = recovery.updatedAt > new Date(portfolio.lastAutosavedAt || 0).getTime();
      if (newerThanServer && recoveryLen >= currentLen) setLocalBackupAvailable(recovery);
    });
    return () => { active = false; };
  }, [assignment, currentUser.id, portfolio?.id, portfolio?.lastAutosavedAt, workflowState?.canEdit]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      if (assignment && workflowState?.canEdit && autosaveStatus === 'offline') void saveNow();
    };
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [assignment, autosaveStatus, saveNow, workflowState?.canEdit]);

  const restoreLocalBackup = async () => {
    if (!localBackupAvailable?.draft || !assignment || !workflowState?.canEdit) return;
    for (const [axisId, resp] of Object.entries(localBackupAvailable.draft) as [PoeticAxisId, any][]) {
      if (resp?.analysisText || resp?.evidenceQuotes) {
        updateDraft(currentUser.id, assignment.id, axisId, resp.analysisText || '', resp.evidenceQuotes || []);
      }
    }
    setLocalBackupAvailable(null);
    try {
      await manualSaveDraft(currentUser.id, assignment.id);
      await clearDraftRecovery(currentUser.id, assignment.id);
      addToast({ type: 'success', title: 'Đã khôi phục và đồng bộ', message: 'Bản nháp cục bộ đã được lưu lên hệ thống.' });
    } catch {
      addToast({ type: 'warning', title: 'Đã khôi phục trên thiết bị', message: 'Bản nháp vẫn được giữ an toàn và sẽ đồng bộ khi kết nối ổn định.' });
    }
  };

  const jumpToFeedbackAnchor = (item: typeof axisFeedbacks[number]) => {
    setActiveAxisId(item.axisId);
    setMobileTab('write');
    const exact = item.anchor?.exact || item.selectedSnippet || '';
    window.requestAnimationFrame(() => {
      const textarea = analysisTextareaRef.current;
      if (!textarea) return;
      const text = textarea.value || '';
      let start = typeof item.anchor?.start === 'number' ? item.anchor.start : -1;
      let end = typeof item.anchor?.end === 'number' ? item.anchor.end : -1;
      if (!exact || start < 0 || end <= start || text.slice(start, end) !== exact) {
        start = exact ? text.indexOf(exact) : -1;
        end = start >= 0 ? start + exact.length : -1;
      }
      textarea.focus();
      if (start >= 0 && end > start) textarea.setSelectionRange(start, end);
      textarea.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 0);
  };

  const handleTextSelection = () => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length >= 5 && sel.length <= 400) {
      setSelectedQuoteSnippet(sel);
    } else {
      setSelectedQuoteSnippet('');
    }
  };

  const insertQuoteToEvidence = () => {
    if (!selectedQuoteSnippet || !assignment) return;
    const cleanQuote = selectedQuoteSnippet.replace(/\s+/g, ' ');
    const existingQuotes = (currentAxis?.evidenceQuotes || []).map(q => typeof q === 'string' ? q : q?.text || '');
    if (!evidenceText.includes(cleanQuote) && !existingQuotes.includes(cleanQuote)) {
      const nextQuotesText = evidenceText ? `${evidenceText}\n"${cleanQuote}"` : `"${cleanQuote}"`;
      updateEvidence(nextQuotesText);
      addToast({
        type: 'success',
        title: 'Đã thêm dẫn chứng',
        message: `Đã trích dẫn vào trục ${currentAxisMeta.shortName}.`
      });
    }
    setSelectedQuoteSnippet('');
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      // safe fallback
    }
  };

  // Keyboard shortcuts listener with dialog & input guards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitModalOpen) return;
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();

      // Ctrl/Cmd + S: Save Draft
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void saveNow();
        return;
      }
      // Ctrl/Cmd + Enter: Open Submit Modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (workflowState?.canEdit) {
          setIsPredictionMode(false);
          setIsSubmitModalOpen(true);
        }
        return;
      }
      // Alt + 1..6: Switch axis (bỏ qua nếu đang nhập liệu trong ô input/select khác)
      if (e.altKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        if (activeTag === 'input' || activeTag === 'select') return;
        e.preventDefault();
        const index = Number(e.key) - 1;
        if (POETIC_AXES[index]) {
          setActiveAxisId(POETIC_AXES[index].id);
        }
        return;
      }
      // Esc: exit focus view
      if (e.key === 'Escape' && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, isSubmitModalOpen, saveNow, workflowState?.canEdit]);

  if (isLoading && !assignment) {
    return <SkeletonEditor />;
  }
  if (dataError && !assignment) {
    return <StatePanel title="Không thể tải dữ liệu" message={dataError} actionLabel="Thử lại" onAction={() => void workspaceQuery.refetch()} />;
  }
  if (!currentUser.id) {
    return <StatePanel title="Phiên đăng nhập hết hạn" message="Vui lòng đăng nhập lại để tiếp tục viết bài." actionLabel="Đăng nhập" onAction={() => onNavigate('dashboard')} />;
  }
  if (!assignment) {
    return <StatePanel title="Không tìm thấy nhiệm vụ" message="Nhiệm vụ này không tồn tại hoặc bạn chưa được phân công." actionLabel="Xem danh sách nhiệm vụ" onAction={() => onNavigate('assignment-list')} />;
  }
  if (!portfolio) {
    return <StatePanel title="Chưa có hồ sơ cho nhiệm vụ này" message="Hồ sơ học tập của bạn đang được tạo. Hãy tải lại dữ liệu." actionLabel="Tải lại dữ liệu" onAction={() => void workspaceQuery.refetch()} />;
  }

  const saveStatus = autosaveStatus === 'saving'
    ? { text: 'Đang đồng bộ…', className: 'v3-save-busy text-sky-600', icon: <CloudArrowUpIcon className="h-4 w-4 animate-pulse" /> }
    : autosaveStatus === 'conflict'
      ? { text: 'Có xung đột bản nháp', className: 'v3-save-dirty text-rose-600', icon: <ExclamationCircleIcon className="h-4 w-4" /> }
      : autosaveStatus === 'offline' || !isOnline
        ? { text: 'Đã giữ trên thiết bị · chờ mạng', className: 'v3-save-dirty text-amber-700', icon: <ExclamationCircleIcon className="h-4 w-4" /> }
        : autosaveStatus === 'dirty'
          ? { text: 'Có thay đổi chưa đồng bộ', className: 'v3-save-dirty text-amber-600', icon: <ExclamationCircleIcon className="h-4 w-4" /> }
          : { text: `Đã đồng bộ ${lastSavedTime || 'gần đây'}`, className: 'v3-save-ok text-emerald-600', icon: <CheckCircleIcon className="h-4 w-4" /> };

  return (
    <div className={`flex min-h-[calc(100vh-4rem)] flex-col bg-white ${isFocusMode ? 'editor-focus-active' : ''}`}>
      {/* Top Workspace Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('assignment-list')}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Quay lại
            </Button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-bold text-slate-900">{assignment.title}</span>
                <Badge size="sm" variant="outline">{portfolio.currentActiveVersion || 'Nháp'}</Badge>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {literatureText ? `${literatureText.title} — ${literatureText.author}` : 'Ngữ liệu'} · {completedAxes}/{POETIC_AXES.length} trục đã viết
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-xs sm:flex-none">
            {/* Autosave Status Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 font-medium ${saveStatus.className}`}
              aria-live="polite"
              title={lastSaveError || 'Trạng thái lưu bài viết'}
            >
              {saveStatus.icon}
              <span className="hidden sm:inline">{saveStatus.text}</span>
            </span>

            {/* Focus toggle */}
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? "Thoát chế độ tập trung (Esc)" : "Chế độ tập trung"}
              className={`hidden md:inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                isFocusMode
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {isFocusMode ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
              <span>{isFocusMode ? 'Thoát' : 'Tập trung'}</span>
            </button>

            {workflowState?.canEdit && (
              <Button size="sm" variant="outline" onClick={saveNow} title="Phím tắt: Ctrl/Cmd + S">
                Lưu nháp
              </Button>
            )}

            {workflowState?.canEdit && predictionAvailable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsPredictionMode(true);
                  setIsSubmitModalOpen(true);
                }}
              >
                Nộp V0 (dự đoán)
              </Button>
            )}

            {workflowState?.canEdit && (
              <Button
                size="sm"
                variant="primary"
                title="Phím tắt: Ctrl/Cmd + Enter"
                onClick={() => {
                  setIsPredictionMode(false);
                  setIsSubmitModalOpen(true);
                }}
              >
                {isInitial ? 'Nộp bài V1' : `Nộp ${nextSubmissionVersion(versions)}`}
              </Button>
            )}
          </div>
        </div>

        {/* Focus banner */}
        {isFocusMode && (
          <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
            <span>Đang bật <strong>chế độ tập trung</strong>.</span>
            <button
              type="button"
              onClick={() => setIsFocusMode(false)}
              className="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-900"
            >
              Thoát (Esc)
            </button>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="mt-2.5 flex border-t border-slate-100 pt-2 lg:hidden" role="tablist" aria-label="Khu vực bài làm trên di động">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'write'}
            onClick={() => selectMobileTab('write')}
            className={`flex-1 py-1.5 text-center text-xs font-medium border-b-2 transition-colors ${
              mobileTab === 'write' ? 'border-primary-600 text-primary-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            Viết ({completedAxes}/6)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'evidence'}
            onClick={() => selectMobileTab('evidence')}
            className={`flex-1 py-1.5 text-center text-xs font-medium border-b-2 transition-colors ${
              mobileTab === 'evidence' ? 'border-primary-600 text-primary-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            Dẫn chứng
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'feedback'}
            onClick={() => selectMobileTab('feedback')}
            className={`flex-1 py-1.5 text-center text-xs font-medium border-b-2 transition-colors ${
              mobileTab === 'feedback' ? 'border-primary-600 text-primary-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            Phản hồi {axisFeedbacks.length > 0 && `(${axisFeedbacks.length})`}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'prompt'}
            onClick={() => selectMobileTab('prompt')}
            className={`flex-1 py-1.5 text-center text-xs font-medium border-b-2 transition-colors ${
              mobileTab === 'prompt' ? 'border-primary-600 text-primary-700 font-semibold' : 'border-transparent text-slate-500'
            }`}
          >
            Yêu cầu
          </button>
        </div>
      </header>

      {/* 3-Column Desk Layout */}
      <div className={`mx-auto grid w-full flex-1 transition-all duration-200 ${
        isFocusMode
          ? 'max-w-4xl grid-cols-1 px-4 py-6'
          : isLeftCollapsed
            ? 'max-w-[100rem] grid-cols-1 lg:grid-cols-[64px_minmax(0,1fr)_340px]'
            : 'max-w-[100rem] grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_340px]'
      }`}>
        {/* Left Rail: 6 Poetic Axes */}
        {!isFocusMode && (
          <aside className={`border-b border-slate-200 bg-slate-50/60 p-3 lg:border-b-0 lg:border-r ${mobileTab !== 'write' ? 'hidden lg:block' : ''}`}>
            <div className="mb-2.5 flex items-center justify-between px-1">
              {!isLeftCollapsed && (
                <span className="text-xs font-bold text-slate-500">Trục phân tích</span>
              )}
              <button
                type="button"
                onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                className="hidden lg:inline-flex rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                title={isLeftCollapsed ? "Mở rộng trục (Alt+1..6)" : "Thu gọn trục"}
                aria-label={isLeftCollapsed ? "Mở rộng thanh trục" : "Thu gọn thanh trục"}
              >
                {isLeftCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
              </button>
            </div>

            <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0" aria-label="Trục phân tích">
              {POETIC_AXES.map((axis, idx) => {
                const response = portfolio.currentDraft?.[axis.id];
                const done = Boolean(response?.analysisText?.trim());
                const active = activeAxisId === axis.id;

                return (
                  <button
                    key={axis.id}
                    type="button"
                    onClick={() => setActiveAxisId(axis.id)}
                    title={`Trục ${idx + 1}: ${axis.title} (Alt+${idx + 1})`}
                    aria-current={active ? 'step' : undefined}
                    className={`flex shrink-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors lg:w-full ${
                      active
                        ? 'border-primary-300 bg-primary-50 font-semibold text-primary-950'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900'
                    } ${isLeftCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <span className="truncate">
                      {isLeftCollapsed ? (
                        <span className="font-bold text-xs">{idx + 1}</span>
                      ) : (
                        axis.shortName
                      )}
                    </span>
                    {!isLeftCollapsed && (
                      <span
                        className={`shrink-0 text-xs font-bold ${done ? 'text-emerald-700' : 'text-slate-300'}`}
                        aria-label={done ? 'Đã hoàn thành trục này' : 'Chưa hoàn thành'}
                      >
                        {done ? '✓' : '○'}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {!isLeftCollapsed && (
              <div className="mt-4 hidden border-t border-slate-200 pt-3 text-xs text-slate-500 lg:block">
                <div className="flex items-center justify-between">
                  <span>Tiến độ:</span>
                  <strong className="text-slate-800">{completedAxes}/6 trục</strong>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${(completedAxes / 6) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-slate-400">Phím tắt: Alt + 1..6</p>
              </div>
            )}
          </aside>
        )}

        {/* Center: Writing Workspace */}
        <main className={`min-w-0 space-y-6 p-4 sm:p-6 lg:p-7 ${
          mobileTab !== 'write' ? 'hidden lg:block' : ''
        }`}>
          {dataError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              Dữ liệu hiển thị có thể chưa mới nhất: {dataError}
            </div>
          )}

          {workflowState && !workflowState.canEdit && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <strong>{workflowState.statusLabel}.</strong> {workflowState.nextActionHint}
            </div>
          )}

          {localBackupAvailable && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50/80 px-4 py-3 text-xs text-primary-950">
              <div className="flex items-center gap-2">
                <BookmarkSquareIcon className="h-4 w-4 text-primary-700 shrink-0" />
                <span>Phát hiện bản sao lưu cục bộ gần đây từ trình duyệt. Em có muốn khôi phục không?</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={restoreLocalBackup}>
                  Khôi phục ngay
                </Button>
                <button
                  type="button"
                  onClick={() => setLocalBackupAvailable(null)}
                  className="rounded px-2 py-1 text-slate-500 hover:bg-white hover:text-slate-800"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          )}

          {predictionAvailable && (
            <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 sm:p-5">
              <div className="font-bold">Bước đầu tiên: V0 – Dự đoán trước đọc</div>
              <p className="mt-1 text-xs leading-5 text-sky-800">
                {predictionPrompt || 'Trả lời các câu hỏi dưới đây, nêu căn cứ và mức tự tin trước khi nộp V1. V0 sẽ được khóa sau khi nộp.'}
              </p>
              {predictionQuestions.length > 0 ? (
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-800">
                  {predictionQuestions.map((question, index) => (
                    <li key={`${index}-${question}`} className="pl-1">{question}</li>
                  ))}
                </ol>
              ) : (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  Nhiệm vụ đang bật V0 nhưng chưa có bộ câu hỏi. Hãy báo giáo viên để cập nhật nhiệm vụ trước khi nộp.
                </div>
              )}
            </section>
          )}

          <section className="workspace-prose mx-auto">
            {/* Axis Header & Typography Controls */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-primary-700">Đang viết trục</span>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{currentAxisMeta.title}</h1>
                <p className="mt-1 text-xs leading-5 text-slate-500">{currentAxisMeta.description}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{wordCount} từ</span>
                <div className="flex items-center gap-1" aria-label="Cỡ chữ editor">
                  {(['sm', 'base', 'lg'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFontSizeLevel(lvl)}
                      className={`rounded-md px-2 py-1 text-xs transition-colors ${
                        fontSizeLevel === lvl
                          ? 'bg-slate-900 font-semibold text-white'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      {lvl === 'sm' ? 'Nhỏ' : lvl === 'base' ? 'Vừa' : 'Lớn'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Writing Textarea */}
            <div className="mt-5 space-y-5">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Nội dung phân tích</span>
                  <span className="font-normal text-slate-400">Tự động lưu sau khi gõ</span>
                </label>
                <textarea
                  ref={analysisTextareaRef}
                  value={currentAxis?.analysisText || ''}
                  disabled={!workflowState?.canEdit}
                  onChange={e => updateAnalysis(e.target.value)}
                  rows={isFocusMode ? 22 : 16}
                  placeholder="Viết luận điểm, phân tích chi tiết nghệ thuật, lí giải ý nghĩa..."
                  className={`w-full resize-y rounded-lg border border-slate-300 bg-white p-4 font-sans text-slate-900 outline-none transition-colors focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10 ${editorFontSizeClass}`}
                />
              </div>

              {/* Inline Evidence (Visible directly under textarea on desktop, or inside right tab) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Dẫn chứng <span className="font-normal text-slate-400">· mỗi dòng một dẫn chứng</span>
                </label>
                <textarea
                  value={evidenceText}
                  disabled={!workflowState?.canEdit}
                  onChange={e => updateEvidence(e.target.value)}
                  rows={3}
                  placeholder="Nhập các câu văn hoặc chi tiết nghệ thuật trích từ tác phẩm..."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-slate-50/50 p-3 text-sm leading-6 text-slate-800 outline-none transition-colors focus:border-primary-600 focus:bg-white focus:ring-2 focus:ring-primary-600/10"
                />
              </div>
            </div>
          </section>

          {/* Version History Table */}
          {versions.length > 0 && !isFocusMode && (
            <section className="workspace-prose mx-auto space-y-3 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Lịch sử phiên bản</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Mỗi lần nộp tạo một mốc mới, không ghi đè bản cũ.</p>
                </div>
                {versions.length >= 2 && (
                  <Button size="sm" variant="ghost" onClick={() => onNavigate('version-diff', { assignmentId: assignment.id })}>
                    So sánh phiên bản
                  </Button>
                )}
              </div>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {versions.map(ver => (
                  <div key={ver.id} className="flex flex-col gap-2 p-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900">{ver.versionNumber}</span>
                      <span className="ml-2 text-slate-500">{new Date(ver.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="ml-2 text-slate-400">· {ver.stage === 'prediction' ? 'Dự đoán' : ver.stage === 'initial' ? 'Bản đầu' : 'Bản chỉnh sửa'}</span>
                      {ver.revisionReason && <span className="ml-2 italic text-slate-600">· {ver.revisionReason}</span>}
                    </div>
                    {versions.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => onNavigate('version-diff', {
                          assignmentId: assignment.id,
                          v1Number: versions[0].versionNumber,
                          v2Number: ver.versionNumber
                        })}
                        className="shrink-0 font-semibold text-primary-700 hover:text-primary-900"
                      >
                        So sánh
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* REF1 Self-reflection block */}
          {latestRevision && !isFocusMode && (
            <section className="workspace-prose mx-auto space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <div>
                <span className="text-xs font-bold text-primary-700">Tự phản tư</span>
                <h2 className="mt-1 text-base font-bold text-slate-900">REF1 – Sau {latestRevision.versionNumber}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Ghi lại điều em đã thay đổi sau khi sửa bài.</p>
              </div>

              {latestReflection ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                  <strong>Đã nộp REF1.</strong> Giáo viên có thể xem và chấm Rubric cho {latestRevision.versionNumber}.
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    ['changedUnderstanding', '1. Điều quan trọng nhất em đã thay đổi trong cách hiểu tác phẩm sau phản hồi là gì?'],
                    ['mostUsefulFeedback', '2. Phản hồi nào khiến em thay đổi cách đọc nhiều nhất?'],
                    ['incompleteInV1', '3. Ở V1, em đã hiểu chưa đầy đủ điều gì?'],
                    ['improvedInV2', `4. Ở ${latestRevision.versionNumber}, em đã bổ sung hoặc thay đổi điều gì?`],
                    ['transferToNextReading', '5. Nếu đọc một tác phẩm khác, em sẽ vận dụng cách đọc nào từ nhiệm vụ này?']
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>
                      <textarea
                        rows={2}
                        value={reflectionForm[key as keyof typeof reflectionForm]}
                        onChange={e => setReflectionForm(previous => ({ ...previous, [key]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={isSavingReflection}
                    onClick={submitReflection}
                  >
                    Nộp REF1 – Tự phản tư
                  </Button>
                </div>
              )}
            </section>
          )}
        </main>

        {/* Right Inspector: Tabbed Workspace */}
        {!isFocusMode && (
          <aside className={`border-t border-slate-200 bg-slate-50/50 p-4 lg:border-l lg:border-t-0 lg:p-5 ${
            mobileTab === 'write' ? 'hidden lg:block' : ''
          }`}>
            {/* Inspector Tab Bar */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2.5 text-xs font-medium" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'prompt'}
                onClick={() => setInspectorTab('prompt')}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  inspectorTab === 'prompt' ? 'bg-white font-semibold text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Yêu cầu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'text'}
                onClick={() => setInspectorTab('text')}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  inspectorTab === 'text' ? 'bg-white font-semibold text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ngữ liệu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'evidence'}
                onClick={() => setInspectorTab('evidence')}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  inspectorTab === 'evidence' ? 'bg-white font-semibold text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Dẫn chứng
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'feedback'}
                onClick={() => setInspectorTab('feedback')}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  inspectorTab === 'feedback' ? 'bg-white font-semibold text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Phản hồi {axisFeedbacks.length > 0 && `(${axisFeedbacks.length})`}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inspectorTab === 'history'}
                onClick={() => setInspectorTab('history')}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  inspectorTab === 'history' ? 'bg-white font-semibold text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Phiên bản
              </button>
            </div>

            {/* Tab 1: Prompt & Requirements */}
            {inspectorTab === 'prompt' && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-600">Đề bài</h3>
                  <Badge size="sm" variant="outline">{assignment.difficulty}</Badge>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-700">
                  {assignment.prompt || 'Chưa có yêu cầu chi tiết.'}
                </div>
                {predictionAvailable && predictionQuestions.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-sky-200 bg-sky-50/70 p-3">
                    <span className="text-xs font-semibold text-sky-900">Câu hỏi V0 ({predictionQuestions.length} câu):</span>
                    <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-5 text-slate-700">
                      {predictionQuestions.map((question, index) => (
                        <li key={`${index}-${question}`}>{question}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {assignment.guidingSteps && assignment.guidingSteps.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">Các bước:</span>
                    <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-5 text-slate-500">
                      {assignment.guidingSteps.map((step, idx) => (
                        <li key={`${idx}-${step}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'text' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-600">Ngữ liệu</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {literatureText ? `${literatureText.title} — ${literatureText.author}` : 'Chưa có ngữ liệu.'}
                    </p>
                  </div>
                  {primaryTextAvailable && <span className="text-xs text-slate-400">Bôi đen chữ để trích dẫn nhanh</span>}
                </div>
                {predictionAvailable ? (
                  <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
                    Ngữ liệu sẽ mở sau khi em nộp V0.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onMouseUp={primaryTextAvailable ? handleTextSelection : undefined}
                      className="max-h-[60vh] select-text overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 font-serif text-sm leading-7 text-slate-800 selection:bg-primary-100 selection:text-primary-950"
                    >
                      {primaryTextAvailable ? (literatureText?.fullContent || literatureText?.excerpt) : (
                        <span className="font-sans text-sm leading-6">
                          <strong>Giới thiệu tác phẩm (không phải nguyên văn)</strong><br />
                          {literatureText?.synopsis || 'Chưa có phần giới thiệu.'}
                          {literatureText?.historicalContext && <><br /><br />Bối cảnh: {literatureText.historicalContext}</>}
                          <br /><br />Để trích dẫn chính xác, hãy đối chiếu với bản tác phẩm do giáo viên cung cấp.
                        </span>
                      )}
                    </div>

                    {readingGuide && (
                      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                        <h4 className="mb-2 font-semibold text-slate-900">Hướng dẫn đọc theo sáu trục</h4>
                        <p className="whitespace-pre-wrap">{readingGuide}</p>
                      </section>
                    )}
                    {readingSources.length > 0 && (
                      <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5">
                        <strong className="text-slate-700">Nguồn đọc và đối chiếu</strong>
                        {readingSources.map(source => (
                          <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="block break-words text-primary-700 underline hover:text-primary-900">
                            {source.label}
                          </a>
                        ))}
                        <p className="text-slate-500">Trích dẫn theo đúng bản em sử dụng, ghi trang hoặc đoạn khi có thể.</p>
                      </div>
                    )}

                    {selectedQuoteSnippet && (
                      <div className="animate-fade-in sticky bottom-0 z-10 flex flex-col gap-2 rounded-lg border border-primary-300 bg-primary-50 p-3 shadow-md">
                        <div className="line-clamp-2 italic text-xs text-primary-950 font-medium">
                          &ldquo;{selectedQuoteSnippet}&rdquo;
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQuoteSnippet('')}
                            className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Hủy
                          </button>
                          <Button
                            size="sm"
                            variant="primary"
                            leftIcon={<PlusIcon className="h-3.5 w-3.5" />}
                            onClick={insertQuoteToEvidence}
                          >
                            Trích vào {currentAxisMeta.shortName}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Evidence Quotes */}
            {inspectorTab === 'evidence' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600">Dẫn chứng ({currentAxisMeta.shortName})</h3>
                  <span className="text-xs text-slate-400">{(currentAxis?.evidenceQuotes || []).length} câu</span>
                </div>
                <textarea
                  value={evidenceText}
                  onChange={e => updateEvidence(e.target.value)}
                  rows={8}
                  placeholder="Mỗi dòng một trích dẫn ngữ liệu..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
                />
                <p className="text-xs text-slate-400">
                  Dẫn chứng được lưu cùng phần phân tích của trục <strong>{currentAxisMeta.shortName}</strong>.
                </p>
              </div>
            )}

            {/* Tab 3: Feedbacks */}
            {inspectorTab === 'feedback' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600">Phản hồi theo trục</h3>
                  {axisFeedbacks.length > 0 && <Badge size="sm" variant="amber">{axisFeedbacks.length}</Badge>}
                </div>

                {axisFeedbacks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">Chưa có phản hồi cho trục này.</p>
                ) : (
                  <div className="space-y-3">
                    {axisFeedbacks.map(item => {
                      const isAi = item.authorRole === 'ai';
                      return (
                        <div
                          key={item.id}
                          className={`space-y-2 rounded-lg border p-3.5 text-xs transition-all ${
                            isAi
                              ? 'border-primary-200 bg-primary-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold">
                            <div className="flex items-center gap-1.5">
                              {isAi ? (
                                <span className="inline-flex items-center gap-1 rounded bg-primary-100 px-1.5 py-0.5 text-xs font-bold text-primary-800">
                                  <SparklesIcon className="h-3 w-3 text-primary-700" /> Trợ lý AI
                                </span>
                              ) : (
                                <span className="text-slate-700">
                                  {item.authorName || (item.authorRole === 'teacher' ? 'Giáo viên' : 'Bạn học')}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void studentAction.mutateAsync({ action: 'resolve_feedback', feedbackId: item.id })
                                  .catch((error: unknown) => addToast({
                                    type: 'error',
                                    title: 'Không thể cập nhật góp ý',
                                    message: error instanceof Error ? error.message : 'Vui lòng thử lại.'
                                  }));
                              }}
                              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                                item.resolved
                                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                              title={item.resolved ? 'Đã xử lý' : 'Nhấp để đánh dấu đã xử lý'}
                            >
                              <CheckCircleIcon className="h-3 w-3" />
                              <span>{item.resolved ? 'Đã xử lý' : 'Đánh dấu đã sửa'}</span>
                            </button>
                          </div>

                          {item.selectedSnippet && (
                            <div className="space-y-1.5 border-l-2 border-primary-500 bg-white/80 px-2.5 py-1.5 text-slate-600 rounded-r">
                              <div className="italic">&ldquo;{item.selectedSnippet}&rdquo;</div>
                              <button
                                type="button"
                                onClick={() => jumpToFeedbackAnchor(item)}
                                className="font-semibold not-italic text-primary-700 hover:text-primary-900"
                              >
                                Mở đoạn được góp ý
                                {typeof item.anchor?.start === 'number' ? ` · vị trí ${item.anchor.start + 1}–${item.anchor.end || item.anchor.start + item.selectedSnippet.length}` : ''}
                              </button>
                            </div>
                          )}

                          <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{item.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Versions & History */}
            {inspectorTab === 'history' && (
              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-600">Lịch sử bài nộp</h3>
                {versions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">Chưa có phiên bản nào được nộp.</p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
                    {versions.map(ver => (
                      <div key={ver.id} className="p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{ver.versionNumber}</span>
                          <span className="text-slate-400">{new Date(ver.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {ver.revisionReason && (
                          <p className="italic text-slate-600">{ver.revisionReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Sticky Bottom CTA for Mobile */}
      {workflowState?.canEdit && <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${saveStatus.className}`}>
          {saveStatus.icon}
          <span>{saveStatus.text}</span>
        </span>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setIsPredictionMode(false);
            setIsSubmitModalOpen(true);
          }}
        >
          {isInitial ? 'Nộp V1' : `Nộp ${nextSubmissionVersion(versions)}`}
        </Button>
      </div>}

      {/* Submit Modal */}
      {isSubmitModalOpen && workflowState?.canEdit && (
        <CreateVersionModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          nextVersionNumber={nextVersion}
          isInitial={isInitial && !isPredictionMode}
          isPrediction={isPredictionMode}
          feedbacks={allStudentFeedbacks}
          onConfirm={handleConfirmSubmit}
        />
      )}
    </div>
  );
};
