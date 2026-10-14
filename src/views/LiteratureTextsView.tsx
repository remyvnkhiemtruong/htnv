import React, { useMemo, useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { useAuthStore } from '../app/store/useAuthStore';
import { useTeacherLiteratureQuery } from '../app/queries/teacherAcademicQueries';
import type { LiteratureText } from '../types';
import { Alert, Badge, Button, FilterBar, Input, Modal } from '../components/ui';
import { ArrowLeftIcon, PlusIcon, EyeIcon } from '@heroicons/react/24/outline';

interface LiteratureTextsViewProps {
  onNavigate: (view: string, extraParams?: unknown) => void;
}

const EMPTY_TEXTS: LiteratureText[] = [];

async function saveCatalog(payload: unknown) {
  const r = await fetch('/api/academic/catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.code || 'Không thể lưu tác phẩm');
  return d;
}

export const LiteratureTextsView: React.FC<LiteratureTextsViewProps> = ({ onNavigate }) => {
  const compatibility = usePortfolio();
  const currentUser = useAuthStore(state => state.currentUser);
  const isTeacher = currentUser.role === 'teacher';
  const teacherLiteratureQuery = useTeacherLiteratureQuery(currentUser.id, isTeacher && Boolean(currentUser.id));
  const literatureTexts = isTeacher ? (teacherLiteratureQuery.data || EMPTY_TEXTS) : compatibility.literatureTexts;
  const refreshAcademicData = compatibility.refreshAcademicData;
  const isLoading = isTeacher ? teacherLiteratureQuery.isLoading : compatibility.isLoading;
  const canEdit = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const currentTexts = useMemo(() => literatureTexts.filter(text => text.isLatest !== false), [literatureTexts]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiteratureText | null>(null);
  const [selected, setSelected] = useState<LiteratureText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('Truyện ngắn hiện đại');
  const [synopsis, setSynopsis] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [fullContent, setFullContent] = useState('');
  const [context, setContext] = useState('');

  const filtered = useMemo(
    () => currentTexts.filter(t => `${t.title} ${t.author} ${t.genre || ''}`.toLowerCase().includes(search.toLowerCase().trim())),
    [currentTexts, search]
  );

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setAuthor('');
    setYear('');
    setGenre('Truyện ngắn hiện đại');
    setSynopsis('');
    setExcerpt('');
    setFullContent('');
    setContext('');
  };

  const openNew = () => {
    resetForm();
    setError(null);
    setOpen(true);
  };

  const openEdit = (text: LiteratureText) => {
    setEditing(text);
    setTitle(text.title);
    setAuthor(text.author);
    setYear(text.year || '');
    setGenre(text.genre || '');
    setSynopsis(text.synopsis || '');
    setExcerpt(text.excerpt || '');
    setFullContent(text.fullContent || text.excerpt || '');
    setContext(text.historicalContext || '');
    setSelected(null);
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveCatalog({
        action: 'save_literature',
        logicalId: editing?.logicalId,
        title,
        author,
        year,
        genre,
        synopsis,
        excerpt,
        fullContent,
        historicalContext: context,
        tags: editing?.tags?.length ? editing.tags : ['Ngữ văn THPT']
      });
      setOpen(false);
      resetForm();
      if (isTeacher) {
        await Promise.all([teacherLiteratureQuery.refetch(), refreshAcademicData()]);
      } else {
        await refreshAcademicData();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể lưu tác phẩm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('teacher-dashboard')}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Quay lại bàn giáo viên
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ngữ liệu</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Mỗi lần sửa tạo một phiên bản mới. Nhiệm vụ cũ vẫn dùng bản ngữ liệu đã giao.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="primary" onClick={openNew} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Thêm tác phẩm mới
          </Button>
        )}
      </div>

      {(error || (isTeacher && teacherLiteratureQuery.error instanceof Error)) && (
        <Alert type="error" title="Lỗi">{error || (teacherLiteratureQuery.error instanceof Error ? teacherLiteratureQuery.error.message : '')}</Alert>
      )}

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm kiếm theo tên tác phẩm, tác giả hoặc thể loại..."
        onResetFilters={() => setSearch('')}
      />

      {/* Texts List */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Tác phẩm</th>
                <th className="py-3 px-4">Tác giả</th>
                <th className="py-3 px-4 text-center">Phiên bản</th>
                <th className="py-3 px-4">Thể loại</th>
                <th className="py-3 px-4">Giai đoạn</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    {isLoading ? 'Đang tải danh mục tác phẩm...' : 'Không tìm thấy tác phẩm phù hợp.'}
                  </td>
                </tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={() => setSelected(t)}
                        className="hover:text-primary-700 hover:underline text-left font-bold"
                      >
                        {t.title}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{t.author}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge size="sm" variant="outline">
                        {t.revisionNo ? `R${t.revisionNo}` : 'R1'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.genre || 'Văn học'}</td>
                    <td className="py-3 px-4 text-slate-500">{t.year || '—'}</td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(t)} leftIcon={<EyeIcon className="h-3.5 w-3.5" />}>
                        Xem
                      </Button>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                          Tạo phiên bản mới
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / New Modal */}
      <Modal
        isOpen={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={editing ? `Tạo phiên bản mới — ${editing.title}` : 'Thêm tác phẩm mới'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); resetForm(); }} disabled={saving}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={!title.trim() || !author.trim()}
              isLoading={saving}
            >
              {editing ? 'Lưu phiên bản mới' : 'Lưu tác phẩm'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          {editing && (
            <div className="sm:col-span-2 rounded-lg border border-primary-200 bg-primary-50/60 p-3 text-xs text-primary-950">
              Phiên bản hiện tại: <strong>R{editing.revisionNo || 1}</strong>. Khi lưu, hệ thống tạo bản mới; các nhiệm vụ cũ vẫn giữ bản đã giao.
            </div>
          )}
          <Input label="Tên tác phẩm" value={title} onChange={e => setTitle(e.target.value)} />
          <Input label="Tác giả" value={author} onChange={e => setAuthor(e.target.value)} />
          <Input label="Năm / giai đoạn sáng tác" value={year} onChange={e => setYear(e.target.value)} />
          <Input label="Thể loại văn học" value={genre} onChange={e => setGenre(e.target.value)} />
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tóm tắt tác phẩm</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              rows={2}
              value={synopsis}
              onChange={e => setSynopsis(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Đoạn trích trọng tâm</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-sans leading-relaxed text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              rows={4}
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Toàn văn / ngữ liệu đầy đủ</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-sans leading-relaxed text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              rows={7}
              value={fullContent}
              onChange={e => setFullContent(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bối cảnh lịch sử – văn học</label>
            <textarea
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
              rows={2}
              value={context}
              onChange={e => setContext(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Detail Preview Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title || 'Chi tiết tác phẩm'}
        footer={
          <div className="flex justify-end gap-2">
            {selected && canEdit && (
              <Button variant="primary" size="sm" onClick={() => openEdit(selected)}>
                Tạo phiên bản mới
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
              <span>Tác giả: <strong className="text-slate-900">{selected.author}</strong></span>
              <span>·</span>
              <span>Phiên bản: <strong className="text-slate-900">R{selected.revisionNo || 1}</strong></span>
              <span>·</span>
              <span>Thể loại: <strong className="text-slate-900">{selected.genre || 'Văn học'}</strong></span>
              <span>·</span>
              <span>Năm: <strong className="text-slate-900">{selected.year || '—'}</strong></span>
            </div>

            {selected.synopsis && (
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Tóm tắt tác phẩm:</span>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selected.synopsis}
                </p>
              </div>
            )}

            {selected.excerpt && (
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Đoạn trích trọng tâm:</span>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 bg-white p-3.5 rounded-lg border border-slate-200 max-h-72 overflow-y-auto font-sans">
                  {selected.excerpt}
                </div>
              </div>
            )}

            {selected.historicalContext && (
              <div className="space-y-1">
                <span className="font-bold text-slate-900 block">Bối cảnh lịch sử – xã hội:</span>
                <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded border border-slate-200">
                  {selected.historicalContext}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

