import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  HomeIcon,
  DocumentTextIcon,
  XMarkIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../app/store/useAuthStore';
import { usePortfolio } from '../../contexts/PortfolioContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, params?: any) => void;
}

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  roles?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const { assignments, literatureTexts } = usePortfolio();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const homeView =
    currentUser.role === 'teacher' ? 'teacher-dashboard' :
    currentUser.role === 'admin' ? 'admin-view' :
    currentUser.role === 'researcher' ? 'researcher-view' :
    currentUser.role === 'ai' ? 'ai-workspace' :
    currentUser.role === 'peer' ? 'portfolio-list' : 'dashboard';

  const commands = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      { id: 'cmd-home', category: 'Điều hướng', title: 'Đi đến trang chính', icon: HomeIcon, action: () => onNavigate(homeView) },
      { id: 'cmd-assignments', category: 'Học tập', title: 'Danh sách nhiệm vụ', icon: BookOpenIcon, action: () => onNavigate('assignment-list'), roles: ['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'] },
      { id: 'cmd-portfolios', category: 'Hồ sơ', title: 'Hồ sơ học tập', icon: FolderIcon, action: () => onNavigate('portfolio-list'), roles: ['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'] },
      { id: 'cmd-feedback', category: 'Phản hồi', title: currentUser.role === 'student' ? 'Phản hồi cần xử lý' : 'Chấm bài', icon: ChatBubbleLeftRightIcon, action: () => onNavigate(currentUser.role === 'student' ? 'assignment-list' : 'teacher-review'), roles: ['student', 'teacher', 'peer', 'admin'] },
      { id: 'cmd-analytics', category: 'Phân tích', title: currentUser.role === 'student' ? 'Tiến độ học tập' : 'Phân tích lớp', icon: ChartBarIcon, action: () => onNavigate(currentUser.role === 'student' ? 'student-analytics' : 'class-analytics'), roles: ['student', 'teacher', 'researcher', 'admin'] },
      { id: 'cmd-ai', category: 'Phản hồi', title: currentUser.role === 'ai' ? 'Nhập phản hồi AI' : 'Phản hồi AI cần xem', icon: ChatBubbleLeftRightIcon, action: () => onNavigate('ai-workspace'), roles: ['ai', 'teacher', 'admin'] }
    ];

    if (currentUser.role === 'student') {
      assignments.forEach(assignment => {
        const text = literatureTexts.find(item => item.id === assignment.textId);
        base.push({
          id: `assignment-${assignment.id}`,
          category: 'Nhiệm vụ',
          title: `Viết: ${assignment.title}`,
          subtitle: text ? `${text.title} — ${text.author}` : 'Mở bài viết',
          icon: DocumentTextIcon,
          action: () => onNavigate('editor', { assignmentId: assignment.id }),
          roles: ['student']
        });
      });
    }

    literatureTexts.forEach(text =>
      base.push({
        id: `text-${text.id}`,
        category: 'Ngữ liệu',
        title: `${text.title} — ${text.author}`,
        subtitle: `${text.year || ''} ${text.genre ? `· ${text.genre}` : ''}`.trim(),
        icon: BookOpenIcon,
        action: () => onNavigate('literature-texts'),
        roles: ['teacher', 'researcher', 'admin']
      })
    );

    return base;
  }, [assignments, literatureTexts, currentUser.role, homeView, onNavigate]);

  const filteredCommands = useMemo(() => {
    return commands.filter(command => {
      if (command.roles && !command.roles.includes(currentUser.role)) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return command.title.toLowerCase().includes(q) || command.category.toLowerCase().includes(q) || Boolean(command.subtitle?.toLowerCase().includes(q));
    });
  }, [commands, currentUser.role, query]);

  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) setSelectedIndex(0);
  }, [filteredCommands.length, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen) onClose();
        return;
      }
      if (!isOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('input,button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return; }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return; }
        }
      }
      if (event.key === 'ArrowDown') { event.preventDefault(); setSelectedIndex(index => (filteredCommands.length ? (index + 1) % filteredCommands.length : 0)); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setSelectedIndex(index => (filteredCommands.length ? (index - 1 + filteredCommands.length) % filteredCommands.length : 0)); return; }
      if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
        event.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  const select = (command: CommandItem) => {
    command.action();
    onClose();
    setQuery('');
    setSelectedIndex(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-modal">
        <h2 id={titleId} className="sr-only">Tìm nhanh trong hệ thống</h2>
        <div className="relative flex items-center border-b border-slate-200 px-4 py-3">
          <MagnifyingGlassIcon className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
          <input autoFocus value={query} onChange={event => { setQuery(event.target.value); setSelectedIndex(0); }} placeholder="Tìm nhiệm vụ, tác phẩm..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore="true" data-form-type="other" className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
          <button onClick={onClose} className="ml-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Đóng tìm kiếm"><XMarkIcon className="h-4 w-4" /></button>
        </div>
        <div className="max-h-80 space-y-0.5 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">Không tìm thấy kết quả phù hợp với “{query}”.</div>
          ) : filteredCommands.map((command, index) => {
            const Icon = command.icon;
            const isSelected = index === selectedIndex;
            return (
              <button type="button" key={command.id} onClick={() => select(command)} onMouseEnter={() => setSelectedIndex(index)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                <div className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0"><div className="truncate">{command.title}</div>{command.subtitle && <p className="truncate text-xs text-slate-500">{command.subtitle}</p>}</div></div>
                <span className="ml-2 shrink-0 text-xs text-slate-400">{command.category}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400"><span>↑ ↓ điều hướng · Enter chọn</span><span>Esc đóng</span></div>
      </div>
    </div>
  );
};
