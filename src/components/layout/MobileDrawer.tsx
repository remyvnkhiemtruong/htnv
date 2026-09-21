import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../app/store/useAuthStore';
import {
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  HomeIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { Avatar } from '../ui/Avatar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  onLogout?: () => void;
}

type Nav = { id: string; label: string; icon: React.ElementType; params?: any };
type Section = { label: string; items: Nav[] };

const ROLE_NAMES: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
  researcher: 'Nghiên cứu',
  ai: 'Nhập phản hồi AI',
  peer: 'Phản biện',
};

const sectionsForRole = (role: string): Section[] => {
  if (role === 'student') return [{ label: 'Học tập', items: [
    { id: 'dashboard', label: 'Bàn học', icon: HomeIcon },
    { id: 'assignment-list', label: 'Nhiệm vụ', icon: BookOpenIcon },
    { id: 'portfolio-list', label: 'Hồ sơ học tập', icon: FolderIcon },
    { id: 'student-analytics', label: 'Tiến bộ', icon: ChartBarIcon }
  ] }];
  if (role === 'teacher') return [
    { label: 'Công việc', items: [
      { id: 'teacher-dashboard', label: 'Tổng quan', icon: HomeIcon },
      { id: 'teacher-review', label: 'Chấm bài', icon: ClipboardDocumentCheckIcon },
      { id: 'ai-workspace', label: 'Phản hồi AI', icon: ChatBubbleLeftRightIcon }
    ] },
    { label: 'Giảng dạy', items: [
      { id: 'portfolio-list', label: 'Hồ sơ học sinh', icon: FolderIcon },
      { id: 'assignment-builder', label: 'Tạo nhiệm vụ', icon: PlusCircleIcon },
      { id: 'literature-texts', label: 'Ngữ liệu', icon: BookOpenIcon },
      { id: 'rubric-management', label: 'Rubric', icon: AcademicCapIcon }
    ] },
    { label: 'Theo dõi', items: [{ id: 'class-analytics', label: 'Phân tích lớp', icon: UserGroupIcon }] }
  ];
  if (role === 'admin') return [
    { label: 'Quản trị', items: [
      { id: 'admin-view', label: 'Tài khoản & nhật ký', icon: ShieldCheckIcon },
      { id: 'teacher-dashboard', label: 'Giảng dạy', icon: HomeIcon },
      { id: 'ai-workspace', label: 'Phản hồi AI', icon: ChatBubbleLeftRightIcon }
    ] },
    { label: 'Xem dữ liệu', items: [
      { id: 'assignment-list', label: 'Nhiệm vụ học sinh', icon: BookOpenIcon },
      { id: 'portfolio-list', label: 'Hồ sơ học sinh', icon: FolderIcon },
      { id: 'literature-texts', label: 'Ngữ liệu', icon: BookOpenIcon }
    ] },
    { label: 'Theo dõi', items: [
      { id: 'class-analytics', label: 'Phân tích lớp', icon: ChartBarIcon },
      { id: 'researcher-view', label: 'Nghiên cứu', icon: AcademicCapIcon }
    ] }
  ];
  if (role === 'ai') return [
    { label: 'Phản hồi AI', items: [{ id: 'ai-workspace', label: 'Nhập phản hồi', icon: ChatBubbleLeftRightIcon }] },
    { label: 'Xem học sinh', items: [
      { id: 'assignment-list', label: 'Nhiệm vụ', icon: BookOpenIcon },
      { id: 'portfolio-list', label: 'Hồ sơ trong hàng đợi', icon: FolderIcon }
    ] }
  ];
  if (role === 'researcher') return [{ label: 'Nghiên cứu', items: [
    { id: 'researcher-view', label: 'Nghiên cứu', icon: AcademicCapIcon },
    { id: 'portfolio-list', label: 'Hồ sơ', icon: FolderIcon },
    { id: 'class-analytics', label: 'Phân tích lớp', icon: ChartBarIcon }
  ] }];
  return [{ label: 'Phản biện', items: [
    { id: 'portfolio-list', label: 'Hồ sơ phản biện', icon: FolderIcon },
    { id: 'teacher-review', label: 'Đánh giá bạn học', icon: ClipboardDocumentCheckIcon }
  ] }];
};

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, currentView, onNavigate, onLogout }) => {
  const user = useAuthStore(s => s.currentUser);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const sections = sectionsForRole(user.role);

  const go = (item: Nav) => {
    onNavigate(item.id, item.params);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 flex max-w-full">
        <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="mobile-navigation-title" className="safe-top safe-bottom flex w-[min(88vw,22rem)] flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white px-4 py-4 shadow-2xl">
          <div>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={user.name} size="md" />
                <div className="min-w-0">
                  <div id="mobile-navigation-title" className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{ROLE_NAMES[user.role] || user.role}{user.className ? ` · ${user.className}` : ''}</div>
                </div>
              </div>
              <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Đóng menu">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-4" aria-label="Điều hướng di động">
              {sections.map(section => (
                <section key={section.label}>
                  <div className="mb-1.5 px-3 text-xs font-bold text-slate-400">{section.label}</div>
                  <div className="space-y-1">
                    {section.items.map(item => {
                      const Icon = item.icon;
                      const active = currentView === item.id;
                      return (
                        <button
                          key={`${item.id}-${item.label}`}
                          type="button"
                          onClick={() => go(item)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                            active ? 'bg-primary-50 font-semibold text-primary-900' : 'font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                          )}
                        >
                          <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-primary-700' : 'text-slate-500')} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </div>
          {onLogout && (
            <button type="button" onClick={() => { onClose(); onLogout(); }} className="mt-6 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
              <ArrowRightOnRectangleIcon className="h-5 w-5" />Đăng xuất
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
