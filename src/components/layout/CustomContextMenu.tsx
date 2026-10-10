import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Quote,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Home,
  BookOpen,
  Folder,
  BarChart3,
  BookMarked,
  Leaf,
  Snowflake,
  Flower2,
  Sun,
  Command,
  Gift,
  PartyPopper,
  Award,
  Moon,
  ExternalLink,
  Image,
  FileText,
  CheckSquare,
  Scissors,
  Printer,
  Compass,
  Save,
  Send,
  HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../../app/store/useAuthStore';
import { useNotificationStore } from '../../app/store/useNotificationStore';
import type { Season } from '../effects/SeasonalMouseExperience';
import { APP_ROUTES } from '../../app/router/routes';

interface CustomContextMenuProps {
  currentView?: string;
  onNavigate?: (view: string, params?: any) => void;
  onOpenCommandPalette?: () => void;
}

interface TargetContext {
  isInput: boolean;
  inputEl: HTMLInputElement | HTMLTextAreaElement | null;
  isImg: boolean;
  imgSrc: string;
  isLink: boolean;
  linkHref: string;
}

const SEASON_ITEMS: { id: Season; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'autumn', label: 'Thu', icon: Leaf, color: 'text-amber-600' },
  { id: 'winter', label: 'Đông', icon: Snowflake, color: 'text-sky-600' },
  { id: 'spring', label: 'Xuân', icon: Flower2, color: 'text-rose-600' },
  { id: 'summer', label: 'Hè', icon: Sun, color: 'text-orange-600' }
];

const HOLIDAY_ITEMS: { id: Season; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'christmas', label: 'Noel 🎄', icon: Sparkles, color: 'text-emerald-600' },
  { id: 'newyear', label: 'Tết Tây 🎆', icon: PartyPopper, color: 'text-purple-600' },
  { id: 'tet', label: 'Tết Ta 🧧', icon: Gift, color: 'text-red-600' },
  { id: 'teachersday', label: '20/11 🎓', icon: Award, color: 'text-amber-600' },
  { id: 'midautumn', label: 'Trung thu 🏮', icon: Moon, color: 'text-orange-600' }
];

const STORAGE_KEYS = {
  ENABLED: 'cvt_seasonal_effect_enabled',
  SEASON: 'cvt_seasonal_effect_season',
  MOUSE_TRACK: 'cvt_seasonal_mouse_track_enabled'
};

export const CustomContextMenu: React.FC<CustomContextMenuProps> = ({
  currentView,
  onNavigate,
  onOpenCommandPalette
}) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const addToast = useNotificationStore((state) => state.addToast);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState<string>('');
  const [targetContext, setTargetContext] = useState<TargetContext>({
    isInput: false,
    inputEl: null,
    isImg: false,
    imgSrc: '',
    isLink: false,
    linkHref: ''
  });

  const [activeSeason, setActiveSeason] = useState<Season>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SEASON);
      const allKeys = [
        'autumn', 'winter', 'spring', 'summer',
        'christmas', 'newyear', 'tet', 'teachersday', 'midautumn'
      ];
      if (s && allKeys.includes(s)) return s as Season;
    } catch {
      // ignore
    }
    const month = new Date().getMonth();
    if (month >= 8 && month <= 10) return 'autumn';
    if (month === 11 || month === 0 || month === 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    return 'summer';
  });

  const [seasonalEnabled, setSeasonalEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.ENABLED);
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  const [mouseTrackEnabled, setMouseTrackEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.MOUSE_TRACK);
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  const menuRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Determine active view dynamically
  const activeView = useMemo(() => {
    if (currentView) return currentView;
    const path = window.location.pathname;
    const route = Object.values(APP_ROUTES).find((r) => r.path === path);
    return route?.id || 'dashboard';
  }, [currentView]);

  // Home view role mapping
  const homeView = useMemo(() => {
    if (currentUser.role === 'teacher') return 'teacher-dashboard';
    if (currentUser.role === 'admin') return 'admin-view';
    if (currentUser.role === 'researcher') return 'researcher-view';
    if (currentUser.role === 'ai') return 'ai-workspace';
    if (currentUser.role === 'peer') return 'portfolio-list';
    return 'dashboard';
  }, [currentUser.role]);

  const roleLabel = useMemo(() => {
    switch (currentUser.role) {
      case 'student': return 'Học sinh';
      case 'teacher': return 'Giáo viên';
      case 'peer': return 'Bạn học (Peer)';
      case 'researcher': return 'Nghiên cứu viên';
      case 'admin': return 'Quản trị viên';
      case 'ai': return 'Chuyên viên AI';
      default: return 'Khách';
    }
  }, [currentUser.role]);

  // Close helper
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      previousFocusRef.current.focus();
    }
  }, []);

  // Safe navigation helper
  const handleNav = useCallback((view: string, params?: any) => {
    closeMenu();
    if (onNavigate) {
      onNavigate(view, params);
    } else {
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view, params } }));
    }
  }, [closeMenu, onNavigate]);

  // Focus first menu item when opened
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLElement>('button[role="menuitem"], button');
      first?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  // Context menu trigger listener
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If user holds Shift, allow browser native context menu
      if (e.shiftKey) return;

      e.preventDefault();

      if (document.activeElement instanceof HTMLElement) {
        previousFocusRef.current = document.activeElement;
      }

      // Check highlighted text
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      setSelectedText(text);

      // Check target element details
      const target = e.target as HTMLElement | null;
      const isInput = !!(
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      );
      const inputEl = isInput && target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null;

      const imgEl = target?.tagName === 'IMG' ? (target as HTMLImageElement) : target?.closest('img') || null;
      const linkEl = target?.tagName === 'A' ? (target as HTMLAnchorElement) : target?.closest('a') || null;

      setTargetContext({
        isInput,
        inputEl,
        isImg: !!imgEl,
        imgSrc: imgEl?.src || '',
        isLink: !!linkEl,
        linkHref: linkEl?.href || ''
      });

      // Smart positioning to stay completely inside viewport boundaries
      const menuWidth = 270;
      const menuHeight = 440;
      const pad = 12;

      let x = e.clientX;
      let y = e.clientY;

      // Handle keyboard context menu (Shift+F10 / Apps key where coordinates are 0,0)
      if (x === 0 && y === 0 && document.activeElement instanceof HTMLElement) {
        const rect = document.activeElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.bottom + 4;
      }

      if (x + menuWidth > window.innerWidth - pad) {
        x = window.innerWidth - menuWidth - pad;
      }
      if (y + menuHeight > window.innerHeight - pad) {
        y = Math.max(pad, window.innerHeight - menuHeight - pad);
      }

      setPosition({ x: Math.max(pad, x), y: Math.max(pad, y) });
      setIsOpen(true);
    };

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (!menuRef.current) return;
      const items = [...menuRef.current.querySelectorAll<HTMLElement>('button[role="menuitem"], button:not([disabled])')];
      if (!items.length) return;
      const activeIdx = items.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeIdx >= 0 ? (activeIdx + 1) % items.length : 0;
        items[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
        items[prev]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus();
      } else if (e.key === 'Tab') {
        if (e.shiftKey && (document.activeElement === items[0] || activeIdx === -1)) {
          e.preventDefault();
          items[items.length - 1]?.focus();
        } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  // Synchronize external seasonal changes
  useEffect(() => {
    const handleSeasonalSync = (e: CustomEvent) => {
      if (e.detail?.season) setActiveSeason(e.detail.season);
      if (typeof e.detail?.enabled === 'boolean') setSeasonalEnabled(e.detail.enabled);
      if (typeof e.detail?.mouseTrack === 'boolean') setMouseTrackEnabled(e.detail.mouseTrack);
    };

    window.addEventListener('cvt:seasonal_change', handleSeasonalSync as EventListener);
    return () => {
      window.removeEventListener('cvt:seasonal_change', handleSeasonalSync as EventListener);
    };
  }, []);

  // Text actions
  const copyRawText = useCallback(async () => {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
      addToast({
        type: 'success',
        title: 'Đã sao chép',
        message: 'Đã sao chép đoạn văn bản vào bộ nhớ tạm.'
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Lỗi sao chép',
        message: 'Trình duyệt không cho phép truy cập bộ nhớ tạm.'
      });
    }
    closeMenu();
  }, [addToast, closeMenu, selectedText]);

  const copyAsLiteratureQuote = useCallback(async () => {
    if (!selectedText) return;
    const formatted = `“${selectedText}”`;
    try {
      await navigator.clipboard.writeText(formatted);
      addToast({
        type: 'success',
        title: 'Đã tạo trích dẫn',
        message: 'Đã định dạng trích dẫn chuẩn văn học trong ngoặc kép đôi “...”'
      });
    } catch {
      // ignore
    }
    closeMenu();
  }, [addToast, closeMenu, selectedText]);

  const copyAsEvidencePrompt = useCallback(async () => {
    if (!selectedText) return;
    const prompt = `[Dẫn chứng]: “${selectedText}”\n[Phân tích nghệ thuật & ý nghĩa]: `;
    try {
      await navigator.clipboard.writeText(prompt);
      addToast({
        type: 'success',
        title: 'Tạo khung dẫn chứng 6 phần',
        message: 'Đã tạo mẫu dẫn chứng kèm vị trí phân tích nghệ thuật.'
      });
    } catch {
      // ignore
    }
    closeMenu();
  }, [addToast, closeMenu, selectedText]);

  // Input editing actions
  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (targetContext.inputEl) {
        const el = targetContext.inputEl;
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = el.value;
        el.value = val.slice(0, start) + text + val.slice(end);
        el.selectionStart = el.selectionEnd = start + text.length;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      addToast({
        type: 'success',
        title: 'Đã dán nội dung',
        message: 'Nội dung bộ nhớ tạm đã được dán vào ô nhập.'
      });
    } catch {
      addToast({
        type: 'warning',
        title: 'Cần quyền truy cập',
        message: 'Vui lòng nhấn Ctrl + V để dán trực tiếp.'
      });
    }
    closeMenu();
  }, [addToast, closeMenu, targetContext.inputEl]);

  const selectAllInInput = useCallback(() => {
    if (targetContext.inputEl) {
      targetContext.inputEl.focus();
      targetContext.inputEl.select();
    }
    closeMenu();
  }, [closeMenu, targetContext.inputEl]);

  const clearInputContent = useCallback(() => {
    if (targetContext.inputEl) {
      targetContext.inputEl.value = '';
      targetContext.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    closeMenu();
  }, [closeMenu, targetContext.inputEl]);

  // Seasonal change dispatcher
  const switchSeason = useCallback((season: Season) => {
    setActiveSeason(season);
    try {
      localStorage.setItem(STORAGE_KEYS.SEASON, season);
      localStorage.setItem(STORAGE_KEYS.ENABLED, 'true');
      setSeasonalEnabled(true);
      window.dispatchEvent(
        new CustomEvent('cvt:seasonal_change', {
          detail: { season, enabled: true, mouseTrack: mouseTrackEnabled }
        })
      );
    } catch {
      // ignore
    }
  }, [mouseTrackEnabled]);

  const toggleSeasonal = useCallback(() => {
    const next = !seasonalEnabled;
    setSeasonalEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEYS.ENABLED, String(next));
      window.dispatchEvent(
        new CustomEvent('cvt:seasonal_change', {
          detail: { season: activeSeason, enabled: next, mouseTrack: mouseTrackEnabled }
        })
      );
    } catch {
      // ignore
    }
  }, [activeSeason, mouseTrackEnabled, seasonalEnabled]);

  const toggleMouseTrail = useCallback(() => {
    const next = !mouseTrackEnabled;
    setMouseTrackEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEYS.MOUSE_TRACK, String(next));
      window.dispatchEvent(
        new CustomEvent('cvt:seasonal_change', {
          detail: { season: activeSeason, enabled: seasonalEnabled, mouseTrack: next }
        })
      );
    } catch {
      // ignore
    }
  }, [activeSeason, mouseTrackEnabled, seasonalEnabled]);

  // Word count analysis
  const selectionStats = useMemo(() => {
    if (!selectedText) return null;
    const words = selectedText.split(/\s+/).filter(Boolean).length;
    const chars = selectedText.length;
    return { words, chars };
  }, [selectedText]);

  // Contextual Title & Icon helper
  const headerContext = useMemo(() => {
    if (selectedText) {
      return {
        icon: Quote,
        title: 'Đoạn trích bôi đen',
        subtitle: selectionStats ? `${selectionStats.words} từ · ${selectionStats.chars} ký tự` : ''
      };
    }
    if (targetContext.isImg) {
      return { icon: Image, title: 'Hình ảnh & Logo', subtitle: 'Chi tiết đồ họa' };
    }
    if (targetContext.isLink) {
      return { icon: ExternalLink, title: 'Liên kết điều hướng', subtitle: 'Đường dẫn liên kết' };
    }
    if (targetContext.isInput) {
      return { icon: FileText, title: 'Ô nhập dữ liệu', subtitle: 'Soạn thảo văn bản' };
    }

    switch (activeView) {
      case 'editor':
        return { icon: FileText, title: 'Bàn soạn thảo bài viết', subtitle: 'Bài đầu tiên và các bài chỉnh sửa' };
      case 'version-diff':
        return { icon: Compass, title: 'So sánh phiên bản bài làm', subtitle: 'So sánh thay đổi trong 6 phần' };
      case 'teacher-review':
        return { icon: Award, title: 'Bàn chấm bài giáo viên', subtitle: 'Chấm bảng tiêu chí chấm điểm & Góp ý bài làm' };
      case 'student-analytics':
      case 'class-analytics':
        return { icon: BarChart3, title: 'Tiến độ & Phân tích', subtitle: 'Biểu đồ năng lực 6 phần' };
      case 'literature-texts':
        return { icon: BookMarked, title: 'Kho tác phẩm văn học', subtitle: 'Ngữ liệu chương trình' };
      case 'assignment-list':
        return { icon: BookOpen, title: 'Nhiệm vụ học tập', subtitle: 'Hạn nộp & yêu cầu' };
      case 'landing':
        return { icon: Sparkles, title: 'Học tốt Ngữ Văn', subtitle: 'Copyright © THPT Vị Thanh' };
      default:
        return { icon: Home, title: 'Học tốt Ngữ Văn', subtitle: `${roleLabel} · Copyright THPT Vị Thanh` };
    }
  }, [activeView, roleLabel, selectedText, selectionStats, targetContext.isImg, targetContext.isInput, targetContext.isLink]);

  const HeaderIcon = headerContext.icon;

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu ngữ cảnh riêng Học tốt Ngữ Văn"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="fixed z-50 max-h-[82vh] w-68 overflow-y-auto select-none rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-dropdown backdrop-blur-md animate-fade-in"
    >
      {/* Header Context Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 mb-1 bg-slate-50/80 rounded-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <HeaderIcon className="h-3.5 w-3.5 text-primary-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{headerContext.title}</p>
            {headerContext.subtitle && (
              <p className="text-xs text-slate-500 truncate">{headerContext.subtitle}</p>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {roleLabel}
        </span>
      </div>

      {/* Group 1: Text Selection Context */}
      {selectedText && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={copyAsLiteratureQuote}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold text-primary-950 transition-colors hover:bg-primary-50"
          >
            <Quote className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>Sao chép dạng trích dẫn (“...”)</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={copyAsEvidencePrompt}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Tạo khung dẫn chứng phân tích</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={copyRawText}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Sao chép nguyên văn</span>
          </button>
        </div>
      )}

      {/* Group 2: Target Element Actions (Input, Image, Link) */}
      {targetContext.isInput && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Thao tác soạn thảo
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={pasteFromClipboard}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>Dán nội dung từ Clipboard</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={selectAllInInput}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <CheckSquare className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Chọn tất cả (Ctrl + A)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={clearInputContent}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <Scissors className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>Làm trống ô nhập</span>
          </button>
        </div>
      )}

      {targetContext.isImg && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Thao tác hình ảnh
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.open(targetContext.imgSrc, '_blank');
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Mở hình ảnh trong tab mới</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await navigator.clipboard.writeText(targetContext.imgSrc);
              addToast({ type: 'success', title: 'Đã sao chép liên kết ảnh', message: targetContext.imgSrc });
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Sao chép đường dẫn ảnh</span>
          </button>
        </div>
      )}

      {targetContext.isLink && !selectedText && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Thao tác liên kết
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.open(targetContext.linkHref, '_blank');
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Mở liên kết trong tab mới</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await navigator.clipboard.writeText(targetContext.linkHref);
              addToast({ type: 'success', title: 'Đã sao chép liên kết', message: targetContext.linkHref });
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Sao chép địa chỉ liên kết</span>
          </button>
        </div>
      )}

      {/* Group 3: Dynamic Page Actions Based on currentView */}
      {activeView === 'editor' && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Thao tác bài viết
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              addToast({ type: 'info', title: 'Bản nháp an toàn', message: 'Hệ thống tự động lưu bản nháp theo thời gian thực vào LocalStorage.' });
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Save className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Kiểm tra trạng thái lưu nháp</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('version-diff')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Compass className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>Mở So sánh phiên bản (Diff)</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('literature-texts')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <BookMarked className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Tra cứu ngữ liệu tác phẩm</span>
          </button>
        </div>
      )}

      {activeView === 'version-diff' && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Thao tác so sánh
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('editor')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <FileText className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>Quay lại bàn soạn thảo</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('student-analytics')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Xem biểu đồ tiến bộ 6 phần</span>
          </button>
        </div>
      )}

      {activeView === 'teacher-review' && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Nghiệp vụ giáo viên
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              addToast({ type: 'info', title: 'Góp ý bằng câu hỏi', message: 'Chỉ ra chỗ cần xem lại và đặt câu hỏi để học sinh tự sửa.' });
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Xem cách góp ý bằng câu hỏi</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('class-analytics')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>Phân tích năng lực toàn lớp</span>
          </button>
        </div>
      )}

      {activeView === 'landing' && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
          <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
            Khám phá hệ thống
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNav('login')}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-bold text-primary-700 hover:bg-primary-50"
          >
            <Send className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>Đăng nhập hệ thống</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const el = document.getElementById('six-axes');
              el?.scrollIntoView({ behavior: 'smooth' });
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Compass className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Khám phá Khung 6 phần phân tích</span>
          </button>
        </div>
      )}

      {/* Group 4: Quick Navigation Core */}
      <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
        <div className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-400">
          Điều hướng nhanh
        </div>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav(homeView)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Home className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Bàn làm việc chính ({roleLabel})</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('assignment-list')}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BookOpen className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Nhiệm vụ đọc hiểu</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('portfolio-list')}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Folder className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Hồ sơ bài viết</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav(currentUser.role === 'teacher' ? 'class-analytics' : 'student-analytics')}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BarChart3 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Tiến độ năng lực 6 phần</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav('literature-texts')}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <BookMarked className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Kho tác phẩm văn học</span>
        </button>
      </div>

      {/* Group 5: Seasonal & Holiday Settings */}
      <div className="border-b border-slate-100 pb-1.5 mb-1.5">
        <div className="flex items-center justify-between px-2.5 py-1 text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-normal">Không gian mùa & Lễ hội</span>
          <button
            type="button"
            onClick={toggleSeasonal}
            className={`text-xs font-medium ${
              seasonalEnabled ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {seasonalEnabled ? 'Đang bật' : 'Đã tắt'}
          </button>
        </div>

        {/* 4 Seasons Quick Switch */}
        <div className="grid grid-cols-4 gap-1 px-1.5 py-1">
          {SEASON_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = activeSeason === item.id && seasonalEnabled;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                title={`Chuyển sang Mùa ${item.label}`}
                onClick={() => switchSeason(item.id)}
                className={`flex flex-col items-center justify-center rounded-md py-1 text-xs transition-colors ${
                  isSelected
                    ? 'border border-primary-400 bg-primary-50 font-bold text-primary-900'
                    : 'border border-slate-200 bg-slate-50/60 font-medium text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Special Holidays Quick Switch */}
        <div className="mt-1 px-1.5">
          <div className="grid grid-cols-3 gap-1">
            {HOLIDAY_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSeason === item.id && seasonalEnabled;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  title={`Chuyển sang ${item.label}`}
                  onClick={() => switchSeason(item.id)}
                  className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? 'border border-primary-400 bg-primary-50 font-bold text-primary-900'
                      : 'border border-slate-200 bg-slate-50/60 font-medium text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`h-3 w-3 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mouse Tracking Toggle */}
        <button
          type="button"
          role="menuitem"
          onClick={toggleMouseTrail}
          className="mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Track chuột & bụi sao</span>
          </span>
          <span className={`h-2 w-2 rounded-full ${mouseTrackEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        </button>
      </div>

      {/* Group 6: Page Utilities */}
      <div className="space-y-0.5">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            if (onOpenCommandPalette) {
              onOpenCommandPalette();
            } else {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
            }
          }}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <span className="flex items-center gap-2">
            <Command className="h-3.5 w-3.5 text-slate-500" />
            <span>Bảng lệnh nhanh</span>
          </span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-slate-500">
            Ctrl K
          </kbd>
        </button>

        <div className="grid grid-cols-2 gap-1 px-1">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowUp className="h-3.5 w-3.5 text-slate-500" />
            <span>Đầu trang</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowDown className="h-3.5 w-3.5 text-slate-500" />
            <span>Cuối trang</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 px-1">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              window.print();
            }}
            className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>In / PDF</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              window.location.reload();
            }}
            className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <RotateCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Tải lại trang</span>
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-1 border-t border-slate-100 pt-1 text-center text-slate-400">
        <span className="text-xs">
          Copyright © THPT Vị Thanh · Shift + Chuột phải: Menu gốc
        </span>
      </div>
    </div>
  );
};
