import React from 'react';
import { useAuthStore } from '../../app/store/useAuthStore';
import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  HomeIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { Tooltip } from '../ui/Tooltip';

interface AppSidebarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

type NavItem = { id: string; label: string; icon: React.ElementType; params?: any };
type NavSection = { label: string; items: NavItem[] };

const ROLE_NAMES: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  admin: 'Quản trị viên',
  researcher: 'Nghiên cứu',
  ai: 'Nhập phản hồi AI',
  peer: 'Phản biện',
};

const studentSections: NavSection[] = [{
  label: 'Học tập',
  items: [
    { id: 'dashboard', label: 'Bàn học', icon: HomeIcon },
    { id: 'assignment-list', label: 'Nhiệm vụ', icon: BookOpenIcon },
    { id: 'portfolio-list', label: 'Hồ sơ học tập', icon: FolderIcon },
    { id: 'student-analytics', label: 'Tiến độ', icon: ChartBarIcon }
  ]
}];

const teacherSections: NavSection[] = [
  {
    label: 'Công việc',
    items: [
      { id: 'teacher-dashboard', label: 'Tổng quan', icon: HomeIcon },
      { id: 'teacher-review', label: 'Chấm bài', icon: ClipboardDocumentCheckIcon },
      { id: 'ai-workspace', label: 'Phản hồi AI', icon: ChatBubbleLeftRightIcon }
    ]
  },
  {
    label: 'Giảng dạy',
    items: [
      { id: 'portfolio-list', label: 'Hồ sơ học sinh', icon: FolderIcon },
      { id: 'assignment-builder', label: 'Tạo nhiệm vụ', icon: PlusCircleIcon },
      { id: 'literature-texts', label: 'Ngữ liệu', icon: BookOpenIcon },
      { id: 'rubric-management', label: 'Rubric', icon: AcademicCapIcon }
    ]
  },
  {
    label: 'Theo dõi',
    items: [{ id: 'class-analytics', label: 'Phân tích lớp', icon: UserGroupIcon }]
  }
];

const adminSections: NavSection[] = [
  {
    label: 'Quản trị',
    items: [
      { id: 'admin-view', label: 'Tài khoản & nhật ký', icon: ShieldCheckIcon },
      { id: 'teacher-dashboard', label: 'Giảng dạy', icon: HomeIcon },
      { id: 'ai-workspace', label: 'Phản hồi AI', icon: ChatBubbleLeftRightIcon }
    ]
  },
  {
    label: 'Xem dữ liệu',
    items: [
      { id: 'assignment-list', label: 'Nhiệm vụ học sinh', icon: BookOpenIcon },
      { id: 'portfolio-list', label: 'Hồ sơ học sinh', icon: FolderIcon },
      { id: 'literature-texts', label: 'Ngữ liệu', icon: BookOpenIcon }
    ]
  },
  {
    label: 'Theo dõi',
    items: [
      { id: 'class-analytics', label: 'Phân tích lớp', icon: ChartBarIcon },
      { id: 'researcher-view', label: 'Nghiên cứu', icon: AcademicCapIcon }
    ]
  }
];

const aiSections: NavSection[] = [
  {
    label: 'Phản hồi AI',
    items: [{ id: 'ai-workspace', label: 'Nhập phản hồi', icon: ChatBubbleLeftRightIcon }]
  },
  {
    label: 'Xem học sinh',
    items: [
      { id: 'assignment-list', label: 'Nhiệm vụ', icon: BookOpenIcon },
      { id: 'portfolio-list', label: 'Hồ sơ trong hàng đợi', icon: FolderIcon }
    ]
  }
];

const sectionsForRole = (role: string): NavSection[] => {
  if (role === 'student') return studentSections;
  if (role === 'teacher') return teacherSections;
  if (role === 'admin') return adminSections;
  if (role === 'researcher') return [{ label: 'Nghiên cứu', items: [
    { id: 'researcher-view', label: 'Nghiên cứu', icon: AcademicCapIcon },
    { id: 'portfolio-list', label: 'Hồ sơ', icon: FolderIcon },
    { id: 'class-analytics', label: 'Phân tích lớp', icon: ChartBarIcon }
  ] }];
  if (role === 'ai') return aiSections;
  return [{ label: 'Phản biện', items: [
    { id: 'portfolio-list', label: 'Hồ sơ phản biện', icon: FolderIcon },
    { id: 'teacher-review', label: 'Đánh giá bạn học', icon: ClipboardDocumentCheckIcon }
  ] }];
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  className
}) => {
  const user = useAuthStore(s => s.currentUser);
  const sections = sectionsForRole(user.role);

  return (
    <aside
      className={cn(
        'hidden sticky top-16 h-[calc(100dvh-4rem)] self-start overflow-y-auto shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-2.5 py-3 transition-[width] duration-200 md:flex',
        isCollapsed ? 'w-[68px]' : 'w-60',
        className
      )}
    >
      <div className="min-w-0">
        <div className="mb-3 flex min-h-9 items-center justify-between border-b border-slate-100 px-2 pb-3">
          {!isCollapsed && <span className="truncate text-xs font-semibold text-slate-500">{ROLE_NAMES[user.role] || user.role}</span>}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn('rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700', isCollapsed && 'mx-auto')}
              aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            >
              {isCollapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
          )}
        </div>

        <nav className="space-y-4" aria-label="Điều hướng chính">
          {sections.map(section => (
            <section key={section.label}>
              {!isCollapsed && <div className="mb-1.5 px-2.5 text-xs font-bold text-slate-400">{section.label}</div>}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = currentView === item.id;
                  const Icon = item.icon;
                  const button = (
                    <button
                      type="button"
                      onClick={() => onNavigate(item.id, item.params)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        active ? 'v3-nav-active font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary-700' : 'text-slate-400')} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                  return isCollapsed ? (
                    <Tooltip key={item.id} content={item.label} position="right">{button}</Tooltip>
                  ) : <React.Fragment key={item.id}>{button}</React.Fragment>;
                })}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </aside>
  );
};

