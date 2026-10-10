import { learningText, learningVersionLabel, readableAcademicData } from '../utils/learningLabels';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, PageHeader } from '../components/ui';
import { useAuthStore } from '../app/store/useAuthStore';
import { useTeacherOverviewQuery, useTeacherWorkspaceQuery } from '../app/queries/teacherAcademicQueries';
import type { AcademicSnapshot, AiReviewRequest, PoeticAxisId } from '../types';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const axes: { id: PoeticAxisId; label: string }[] = [
  { id: 'plot_situation', label: 'Tình huống – Cốt truyện' },
  { id: 'character_detail', label: 'Nhân vật – Chi tiết' },
  { id: 'narrator_pov', label: 'Người kể chuyện – Điểm nhìn' },
  { id: 'space_time', label: 'Không gian – Thời gian' },
  { id: 'language_tone_symbol', label: 'Ngôn ngữ – Giọng điệu – Biểu tượng' },
  { id: 'form_argument', label: 'Tổng hợp & Lập luận' }
];

type QueueFilter = 'pending' | 'completed' | 'all';

async function postAction(payload: unknown) {
  const r = await fetch('/api/academic/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(learningText(d.message || 'Không thể cập nhật'));
  return d;
}

export const AiWorkspaceView: React.FC = () => {
  const currentUser = useAuthStore(state => state.currentUser);
  const canPublish = currentUser.role === 'ai';
  const isTeacher = currentUser.role === 'teacher';
  const [snapshot, setSnapshot] = useState<AcademicSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [response, setResponse] = useState('');
  const [axisId, setAxisId] = useState<PoeticAxisId>('form_argument');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const {
    data: teacherOverview,
    error: teacherOverviewError,
    isLoading: teacherOverviewLoading,
    refetch: refetchTeacherOverview
  } = useTeacherOverviewQuery(currentUser.id, isTeacher && Boolean(currentUser.id));

  const refreshCompatibility = useCallback(async () => {
    const r = await fetch('/api/academic/snapshot', { credentials: 'include', cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Không thể tải hàng đợi');
    setSnapshot(readableAcademicData(d.snapshot));
  }, []);

  const refreshOverview = useCallback(async () => {
    if (isTeacher) {
      const result = await refetchTeacherOverview();
      if (result.error) throw result.error;
      return;
    }
    await refreshCompatibility();
  }, [isTeacher, refetchTeacherOverview, refreshCompatibility]);

  useEffect(() => {
    if (isTeacher) {
      if (teacherOverviewError instanceof Error) setMessage({ type: 'error', text: teacherOverviewError.message });
      return;
    }
    void refreshCompatibility().catch(e => setMessage({ type: 'error', text: e.message }));
  }, [isTeacher, refreshCompatibility, teacherOverviewError]);

  const reviews = useMemo<AiReviewRequest[]>(
    () => isTeacher ? (teacherOverview?.aiReviews || []) : (snapshot?.aiReviews || []),
    [isTeacher, snapshot, teacherOverview]
  );
  const pendingCount = reviews.filter(x => x.status !== 'completed').length;
  const completedCount = reviews.filter(x => x.status === 'completed').length;

  const displayedReviews = useMemo(() => {
    return reviews.filter(item => {
      const matchFilter = filter === 'all' ? true : filter === 'completed' ? item.status === 'completed' : item.status !== 'completed';
      if (!matchFilter) return false;
      if (!searchQuery.trim()) return true;
      return item.student_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [reviews, filter, searchQuery]);

  const selected = displayedReviews.find(x => x.id === selectedId) || displayedReviews[0] || null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
      setResponse(selected.response || '');
    }
    if (!selected && selectedId) setSelectedId('');
  }, [selected, selectedId]);

  const teacherWorkspaceQuery = useTeacherWorkspaceQuery(
    currentUser.id,
    selected?.assignment_id || '',
    selected?.student_id || '',
    isTeacher && Boolean(selected)
  );
  const teacherWorkspace = teacherWorkspaceQuery.data;
  const detailedSelected = isTeacher
    ? (teacherWorkspace?.aiReviews.find(item => item.id === selected?.id) || selected)
    : selected;

  useEffect(() => {
    if (!isTeacher || !detailedSelected) return;
    setResponse(detailedSelected.response || '');
  }, [detailedSelected?.id, detailedSelected?.response, isTeacher]);

  const refresh = useCallback(async () => {
    if (isTeacher) {
      const tasks: Promise<unknown>[] = [refreshOverview()];
      if (selected) tasks.push(teacherWorkspaceQuery.refetch());
      await Promise.all(tasks);
      return;
    }
    await refreshOverview();
  }, [isTeacher, refreshOverview, selected, teacherWorkspaceQuery]);

  const portfolioKey = selected ? `port-${selected.student_id}-${selected.assignment_id}` : '';
  const currentPortfolio = isTeacher ? teacherWorkspace?.portfolio : snapshot?.portfolios?.[portfolioKey];
  const currentVersion = currentPortfolio?.versions?.find(v => v.versionNumber === selected?.version_number);
  const assignment = isTeacher
    ? teacherWorkspace?.assignment
    : snapshot?.assignments?.find(a => a.id === selected?.assignment_id);
  const literatureText = isTeacher
    ? teacherWorkspace?.literatureText || undefined
    : snapshot?.literatureTexts?.find(t => t.id === assignment?.textId);
  const rubric = isTeacher
    ? teacherWorkspace?.rubric
    : assignment
      ? (snapshot?.rubrics?.[assignment.rubricId] || snapshot?.rubric)
      : snapshot?.rubric;
  const integrityError = Boolean(
    selected &&
    !(isTeacher && teacherWorkspaceQuery.isLoading) &&
    (!currentPortfolio || !currentVersion)
  );

  const copyFullStudentContextForChatGPT = async () => {
    if (!selected || !currentVersion || !canPublish) return;
    if (selected.status !== 'completed') {
      try {
        await postAction({ action: 'ai_claim_review', reviewId: selected.id });
        await refresh();
      } catch (e: unknown) {
        setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Không thể nhận xử lý bài này.' });
        return;
      }
    }
    const essayParts = axes.map(a => {
      const text = currentVersion.responses?.[a.id]?.analysisText || '';
      return `### ${a.label}\n${text || '(Chưa viết)'}`;
    }).join('\n\n');

    const promptText = `Bạn là trợ lý học tập môn Ngữ văn theo phương pháp 6 phần phân tích.
Nhiệm vụ: ${assignment?.title || ''}
Ngữ liệu: ${literatureText?.title || ''} (${literatureText?.author || ''})
Yêu cầu: ${detailedSelected?.prompt || assignment?.prompt || ''}

BÀI LÀM CỦA HỌC SINH (${selected.student_name} - Phiên bản ${learningVersionLabel(selected.version_number)}):
${essayParts}

Viết nhận xét ngắn, rõ và bám vào bài học sinh. Nêu phần làm được kèm dẫn chứng, chỉ ra chỗ cần sửa và đặt câu hỏi để học sinh tự sửa. Không khen chung chung, không dùng lời quảng bá hoặc viết hộ bài. Nếu thiếu căn cứ, nói rõ phần chưa thể nhận xét. Không quyết định điểm chính thức.`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(promptText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = promptText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // safe fallback
    }
  };

  const publishAiFeedback = async () => {
    if (!canPublish || !selected || !currentVersion || integrityError) return;
    setLoading(true);
    setMessage(null);
    try {
      const rubricProposal = rubric?.criteria?.length
        ? { rubricId: rubric.id, criteria: rubric.criteria.map(c => ({ id: c.id, title: c.title })) }
        : null;
      await postAction({ action: 'ai_complete_review', reviewId: selected.id, response: response.trim(), axisId, rubricProposal });
      setMessage({ type: 'success', text: 'Đã gửi góp ý AI cho học sinh.' });
      await refresh();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Không thể gửi góp ý AI' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="v3-page space-y-5 pb-20">
      <PageHeader
        eyebrow="Phản hồi AI"
        title={canPublish ? 'Nhập phản hồi AI' : 'Theo dõi phản hồi AI'}
        description={canPublish
          ? 'Sao chép bài sang ChatGPT, dán phản hồi vào đây và gửi cho học sinh.'
          : 'Xem góp ý AI cho các bài được phân công. Tài khoản nhập phản hồi AI có quyền gửi góp ý.'}
        actions={
          <Button size="sm" variant="outline" onClick={() => void refresh()} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
            Tải lại
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ['pending', `Chờ nhập · ${pendingCount}`],
            ['completed', `Đã gửi · ${completedCount}`],
            ['all', `Tất cả · ${reviews.length}`]
          ] as [QueueFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
                filter === value
                  ? 'border-primary-300 bg-primary-50 text-primary-950'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && <Alert type={message.type} title={message.type === 'success' ? 'Thông báo' : 'Có lỗi'}>{message.text}</Alert>}
      {isTeacher && teacherOverviewLoading && reviews.length === 0 && (
        <Alert type="info" title="Đang tải hàng đợi">Đang tải góp ý AI của các lớp được phân công.</Alert>
      )}
      {isTeacher && selected && teacherWorkspaceQuery.isLoading && !teacherWorkspace && (
        <Alert type="info" title="Đang tải bài">Đang tải bài đã nộp của học sinh.</Alert>
      )}
      {isTeacher && teacherWorkspaceQuery.error && !teacherWorkspace && (
        <Alert type="error" title="Không thể tải bài">{teacherWorkspaceQuery.error instanceof Error ? teacherWorkspaceQuery.error.message : 'Không thể tải bài của học sinh.'}</Alert>
      )}
      {integrityError && (
        <Alert type="error" title="Không thể mở bản đã nộp">
          Không tìm thấy phiên bản đã nộp của bài này. Không thể gửi phản hồi.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)_390px]">
        {/* Left Pane: Request Queue */}
        <aside className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white lg:h-[78vh]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <span className="text-sm font-bold text-slate-800">Hàng đợi AI</span>
              <div className="mt-0.5 text-xs text-slate-500">{displayedReviews.length} bài trong bộ lọc</div>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
              title="Tải lại"
              aria-label="Tải lại hàng đợi"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Quick search */}
          <div className="border-b border-slate-100 p-2.5">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên học sinh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-2.5 text-xs text-slate-700 outline-none focus:border-primary-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {displayedReviews.length === 0 ? (
              <p className="p-4 text-center text-xs leading-6 text-slate-400">Không có bài trong trạng thái này.</p>
            ) : (
              displayedReviews.map(item => {
                const isSelected = selected?.id === item.id;
                const completed = item.status === 'completed';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      setResponse(item.response || '');
                    }}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-primary-300 bg-primary-50/90 font-semibold'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`truncate text-sm ${isSelected ? 'font-bold text-primary-950' : 'font-semibold text-slate-900'}`}>
                        {item.student_name}
                      </span>
                      {completed ? (
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" title="Đã gửi học sinh" />
                      ) : (
                        <ClockIcon className="h-4 w-4 shrink-0 text-amber-500" title="Chờ nhập phản hồi" />
                      )}
                    </div>
                    <div className={`mt-1 text-xs ${isSelected ? 'text-primary-700' : 'text-slate-500'}`}>
                      {learningVersionLabel(item.version_number)} · {completed ? 'Đã gửi học sinh' : 'Chờ nhập'}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Pane: Student Immutable Version */}
        <main className="min-h-[620px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 lg:h-[78vh]">
          {!selected ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-400">
              Chọn một bài từ hàng đợi bên trái để xem nội dung học sinh đã nộp.
            </div>
          ) : integrityError ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-rose-500">
              Không thể hiển thị phiên bản đã nộp của bài này.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-400">Bản học sinh đã nộp</div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">{selected.student_name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{learningVersionLabel(selected.version_number)}</Badge>
                    <Badge variant="outline">
                      {currentVersion?.stage === 'prediction' ? 'Dự đoán' : currentVersion?.stage === 'initial' ? 'Bản đầu' : 'Bản chỉnh sửa'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">
                  Nhiệm vụ: <strong className="font-semibold text-slate-800">{assignment?.title || selected.assignment_id}</strong>
                  {literatureText && ` · ${literatureText.title} (${literatureText.author})`}
                </div>

                {/* Copy Context Button for Operator */}
                {canPublish && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyFullStudentContextForChatGPT}
                      leftIcon={copiedPrompt ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                    >
                      {copiedPrompt ? 'Đã sao chép' : selected.status === 'completed' ? 'Sao chép lại bài' : 'Nhận xử lý & sao chép bài'}
                    </Button>
                  </div>
                )}
              </div>

              {detailedSelected?.prompt && (
                <div className="mt-4 rounded-lg border-l-3 border-sky-400 bg-sky-50/70 p-3.5 text-xs leading-relaxed text-slate-700">
                  <strong className="text-sky-950 font-semibold">Yêu cầu:</strong> {detailedSelected?.prompt}
                </div>
              )}

              <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Nội dung bài viết theo 6 phần</h3>
                </div>
                {axes.map(axis => {
                  const resp = currentVersion?.responses?.[axis.id];
                  const text = typeof resp?.analysisText === 'string' ? resp.analysisText.trim() : '';
                  const quotes = Array.isArray(resp?.evidenceQuotes) ? resp.evidenceQuotes : [];
                  return (
                    <section key={axis.id} className="space-y-2.5 rounded-lg border border-slate-100 bg-slate-50/40 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{axis.label}</span>
                        <span className="text-xs text-slate-400">{text ? `${text.split(/\s+/).length} từ` : '0 từ'}</span>
                      </div>
                      {text ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 bg-white p-3 rounded border border-slate-200/80">
                          {text}
                        </p>
                      ) : (
                        <span className="text-xs italic text-slate-400 block py-1">Chưa viết nội dung ở trục này.</span>
                      )}
                      {quotes.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-semibold text-slate-500 block">Dẫn chứng:</span>
                          {quotes.map(q => (
                            <blockquote key={q.id} className="rounded border-l-2 border-primary-300 bg-white p-2 text-xs italic leading-relaxed text-slate-600">
                              &ldquo;{q.text}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </main>

        {/* Right Pane: Paste ChatGPT Composer */}
        <aside className="flex min-h-[620px] flex-col overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 lg:h-[78vh]">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <div className="text-xs font-bold text-slate-400">Phản hồi</div>
              <h2 className="mt-1 text-base font-bold text-slate-950">{canPublish ? 'Dán phản hồi ChatGPT' : 'Nội dung phản hồi AI'}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {canPublish ? 'Đối chiếu đúng học sinh, nhiệm vụ và phiên bản trước khi gửi.' : 'Chế độ chỉ xem.'}
              </p>
            </div>

            {assignment?.aiGuidance && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs leading-5 text-slate-700">
                <strong className="text-sky-950">Định hướng phản hồi:</strong>
                <div className="mt-1 whitespace-pre-wrap">{assignment.aiGuidance}</div>
              </div>
            )}

            {assignment?.commonMistakes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs leading-5 text-slate-700">
                <strong>Lỗi thường gặp:</strong>
                <div className="mt-1 whitespace-pre-wrap">{assignment.commonMistakes}</div>
              </div>
            )}

            {assignment?.referenceGuide && (
              <details className="rounded-lg border border-slate-200 p-2.5 text-xs leading-5 text-slate-700">
                <summary className="cursor-pointer font-semibold select-none">Gợi ý chuyên môn</summary>
                <div className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-slate-600 border-t border-slate-100 pt-2">
                  {assignment.referenceGuide}
                </div>
              </details>
            )}

            {rubric?.criteria?.length ? (
              <details className="rounded-lg border border-slate-200 p-2.5 text-xs leading-5 text-slate-700">
                <summary className="cursor-pointer font-semibold select-none">Bảng tiêu chí chấm điểm giáo viên ({rubric.criteria.length} tiêu chí)</summary>
                <div className="mt-2 space-y-1 text-xs border-t border-slate-100 pt-2">
                  {rubric.criteria.map(c => (
                    <div key={c.id} className="text-slate-600">
                      • {c.title}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Trọng tâm phản hồi</label>
              <select
                value={axisId}
                onChange={e => setAxisId(e.target.value as PoeticAxisId)}
                disabled={!canPublish}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              >
                {axes.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Phản hồi từ ChatGPT</label>
                {response.trim() && (
                  <span className="text-xs text-slate-400 font-mono">
                    {response.trim().split(/\s+/).length} từ
                  </span>
                )}
              </div>
              <textarea
                rows={12}
                value={response}
                onChange={e => setResponse(e.target.value)}
                disabled={!canPublish}
                placeholder={canPublish ? 'Dán phản hồi ChatGPT tại đây.' : 'Chưa có phản hồi AI.'}
                className="w-full resize-y rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-600 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              />
            </div>
          </div>

          <div className="mt-auto border-t border-slate-200 pt-4">
            {canPublish ? (
              <>
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={loading}
                  disabled={!selected || !currentVersion || integrityError || !response.trim() || selected?.status === 'completed'}
                  onClick={publishAiFeedback}
                >
                  Gửi góp ý AI cho học sinh
                </Button>
                <p className="mt-2 text-center text-xs leading-5 text-slate-400">
                  Học sinh nhận góp ý ngay sau khi gửi.
                </p>
              </>
            ) : (
              <p className="text-center text-xs leading-5 text-slate-500">
                Giáo viên xử lý tiếp trong mục Chấm bài. Quản trị viên chỉ xem tại đây.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
