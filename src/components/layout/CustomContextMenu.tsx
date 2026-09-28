import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Quote,
  Sparkles,
  ArrowUp,
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
  Moon
} from 'lucide-react';
import { useAuthStore } from '../../app/store/useAuthStore';
import { useNotificationStore } from '../../app/store/useNotificationStore';
import type { Season } from '../effects/SeasonalMouseExperience';

interface CustomContextMenuProps {
  onNavigate?: (view: string, params?: any) => void;
  onOpenCommandPalette?: () => void;
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
  onNavigate,
  onOpenCommandPalette
}) => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const addToast = useNotificationStore((state) => state.addToast);

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState<string>('');
  const [isInsideEditable, setIsInsideEditable] = useState<boolean>(false);
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

  // Context menu trigger listener
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If user holds Shift, allow the browser's native context menu
      if (e.shiftKey) return;

      e.preventDefault();

      // Check highlighted text
      const selection = window.getSelection();
      const text = selection ? selection.toString().trim() : '';
      setSelectedText(text);

      // Check if target is an editable input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = !!(
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      );
      setIsInsideEditable(isInput);

      // Smart positioning to stay completely inside viewport boundaries
      const menuWidth = 260;
      const menuHeight = text ? 420 : 360;
      const pad = 12;

      let x = e.clientX;
      let y = e.clientY;

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
      if (e.key === 'Escape') closeMenu();
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
  }, [closeMenu]);

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
        title: 'Sao chép thành công',
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
        message: 'Đã định dạng trích dẫn chuẩn văn học trong ngoặc kép kép “...”'
      });
    } catch {
      // ignore
    }
    closeMenu();
  }, [addToast, closeMenu, selectedText]);

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

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu ngữ cảnh riêng Học tốt Ngữ Văn"
      style={{ top: `${position.y}px`, left: `${position.x}px` }}
      className="fixed z-50 w-64 select-none rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-dropdown backdrop-blur-md animate-fade-in"
    >
      {/* Header Profile / Branding */}
      <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 mb-1">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary-600" />
          <span className="text-xs font-bold text-slate-800">Học tốt Ngữ Văn</span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {roleLabel}
        </span>
      </div>

      {/* Group 1: Text Selection Context */}
      {selectedText && (
        <div className="border-b border-slate-100 pb-1.5 mb-1.5">
          <div className="flex items-center justify-between px-2.5 py-1 text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-normal">Đoạn văn bản đã chọn</span>
            {selectionStats && (
              <span className="text-xs font-medium text-primary-700">
                {selectionStats.words} từ · {selectionStats.chars} ký tự
              </span>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={copyAsLiteratureQuote}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-800 transition-colors hover:bg-primary-50 hover:text-primary-900"
          >
            <Quote className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span>Sao chép dạng trích dẫn (“...”)</span>
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

      {/* Group 2: Quick Navigation */}
      <div className="border-b border-slate-100 pb-1.5 mb-1.5 space-y-0.5">
        <div className="px-2.5 py-1 text-xs font-semibold uppercase tracking-normal text-slate-400">
          Điều hướng nhanh
        </div>

        <button
          type="button"
          role="menuitem"
          onClick={() => handleNav(homeView)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Home className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>Bàn làm việc chính</span>
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
          <span>Tiến độ năng lực 6 trục</span>
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

      {/* Group 3: Seasonal & Holiday Settings */}
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

      {/* Group 4: Page Utilities */}
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

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ArrowUp className="h-3.5 w-3.5 text-slate-500" />
          <span>Lên đầu trang</span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMenu();
            window.location.reload();
          }}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <RotateCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Tải lại trang</span>
        </button>
      </div>

      {/* Footer hint */}
      <div className="mt-1 border-t border-slate-100 pt-1 text-center text-slate-400">
        <span className="text-xs">
          {isInsideEditable ? 'Shift + Chuột phải: Menu gốc soạn thảo' : 'Shift + Chuột phải: Menu gốc trình duyệt'}
        </span>
      </div>
    </div>
  );
};
