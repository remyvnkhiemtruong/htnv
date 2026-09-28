import React, { useState } from 'react';
import { useAuthStore } from '../../app/store/useAuthStore';
import { useNotificationStore } from '../../app/store/useNotificationStore';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

interface AppHeaderProps {
  onNavigate: (view: string, params?: any) => void;
  currentView: string;
  onOpenCommandPalette: () => void;
  onOpenMobileDrawer?: () => void;
  onLogout?: () => void;
}

type ProfileForm = {
  name: string;
  phone: string;
  dateOfBirth: string;
  school: string;
  schoolYear: string;
  grade: string;
  studentCode: string;
  staffCode: string;
  department: string;
  bio: string;
  learningGoal: string;
  favoriteGenres: string;
  favoriteAuthors: string;
  favoriteWorks: string;
};

const VIEW_TITLES: Record<string, string> = {
  dashboard: 'Bàn học',
  'student-dashboard': 'Bàn học',
  'assignment-list': 'Nhiệm vụ',
  'portfolio-list': 'Hồ sơ học tập',
  editor: 'Bài viết',
  'version-diff': 'So sánh phiên bản',
  'student-analytics': 'Tiến bộ',
  'teacher-dashboard': 'Giảng dạy',
  'teacher-review': 'Chấm bài',
  'assignment-builder': 'Tạo nhiệm vụ',
  'rubric-management': 'Rubric',
  'literature-texts': 'Ngữ liệu',
  'class-analytics': 'Phân tích lớp',
  'researcher-view': 'Nghiên cứu',
  'admin-view': 'Quản trị',
  'ai-workspace': 'Phản hồi AI',
  'ui-kit': 'Bản mẫu giao diện'
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  peer: 'Phản biện',
  researcher: 'Nghiên cứu viên',
  admin: 'Quản trị viên',
  ai: 'Nhập phản hồi AI'
};

const home = (role: string) =>
  role === 'teacher' ? 'teacher-dashboard' :
  role === 'researcher' ? 'researcher-view' :
  role === 'admin' ? 'admin-view' :
  role === 'ai' ? 'ai-workspace' :
  role === 'peer' ? 'portfolio-list' : 'dashboard';

const joinList = (value?: string[]) => Array.isArray(value) ? value.join(', ') : '';
const splitList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

const toForm = (user: any): ProfileForm => ({
  name: user.name || '',
  phone: user.profile?.phone || '',
  dateOfBirth: user.profile?.dateOfBirth || '',
  school: user.profile?.school || '',
  schoolYear: user.profile?.schoolYear || '',
  grade: user.profile?.grade || '',
  studentCode: user.profile?.studentCode || '',
  staffCode: user.profile?.staffCode || '',
  department: user.profile?.department || '',
  bio: user.profile?.bio || '',
  learningGoal: user.profile?.learningGoal || '',
  favoriteGenres: joinList(user.profile?.favoriteGenres),
  favoriteAuthors: joinList(user.profile?.favoriteAuthors),
  favoriteWorks: joinList(user.profile?.favoriteWorks)
});

const fieldClass = (readOnly?: boolean) => `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${readOnly ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-300 bg-white text-slate-900 focus:border-primary-600 focus:ring-3 focus:ring-primary-600/10'}`;

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}> = ({ label, value, onChange, type = 'text', placeholder, readOnly }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-slate-700">{label}</span>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      autoComplete="one-time-code"
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      className={fieldClass(readOnly)}
    />
  </label>
);

export const AppHeader: React.FC<AppHeaderProps> = ({
  onNavigate,
  currentView,
  onOpenCommandPalette,
  onOpenMobileDrawer,
  onLogout
}) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const setAuthenticatedUser = useAuthStore(state => state.setAuthenticatedUser);
  const { addToast } = useNotificationStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => toForm(currentUser));

  const change = (key: keyof ProfileForm, value: string) => setForm(previous => ({ ...previous, [key]: value }));
  const openProfile = () => {
    setForm(toForm(currentUser));
    setProfileOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/auth/me', {
        method:'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          profile: {
            phone: form.phone,
            dateOfBirth: form.dateOfBirth,
            school: form.school,
            schoolYear: form.schoolYear,
            grade: form.grade,
            studentCode: form.studentCode,
            staffCode: form.staffCode,
            department: form.department,
            bio: form.bio,
            learningGoal: form.learningGoal,
            favoriteGenres: splitList(form.favoriteGenres),
            favoriteAuthors: splitList(form.favoriteAuthors),
            favoriteWorks: splitList(form.favoriteWorks)
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.user) throw new Error(data.message || 'Không thể lưu hồ sơ');
      setAuthenticatedUser(data.user);
      setProfileOpen(false);
      addToast({ type: 'success', title: 'Đã lưu hồ sơ', message: 'Thông tin cá nhân đã được cập nhật.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Không thể cập nhật hồ sơ', message: error?.message || 'Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const lastLogin = currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString('vi-VN') : 'Chưa ghi nhận';
  const currentTitle = VIEW_TITLES[currentView] || 'Học tốt Ngữ Văn';

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto h-full max-w-[100rem] px-3 sm:px-5 lg:px-6">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onOpenMobileDrawer} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Mở menu">
              <Bars3Icon className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => onNavigate(home(currentUser.role))} className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-0.5 drop-shadow-sm">
                <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-full w-full object-contain" />
              </span>
              <span className="hidden text-sm font-bold tracking-tight text-primary-900 sm:inline">Học tốt Ngữ Văn</span>
            </button>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800">{currentTitle}</div>
              <div className="hidden truncate text-xs text-slate-400 lg:block">{ROLE_LABELS[currentUser.role] || currentUser.role}{currentUser.className ? ` · ${currentUser.className}` : ''}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={onOpenCommandPalette} className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-white hover:text-slate-700">
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span className="hidden md:inline">Tìm nhanh</span>
              <span className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs text-slate-400 lg:inline">Ctrl K</span>
            </button>
            <button type="button" onClick={() => addToast({ type: 'info', title: 'Thông báo', message: 'Hiện chưa có thông báo mới.' })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Thông báo">
              <BellIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setHelpOpen(true)} className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:block" aria-label="Trợ giúp">
              <QuestionMarkCircleIcon className="h-4 w-4" />
            </button>
            <Dropdown
              trigger={
                <div className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-slate-50">
                  <Avatar name={currentUser.name || 'Người dùng'} size="sm" />
                  <div className="hidden max-w-[150px] text-left xl:block">
                    <div className="truncate text-xs font-semibold text-slate-800">{currentUser.name}</div>
                    <div className="truncate text-xs text-slate-400">{ROLE_LABELS[currentUser.role] || currentUser.role}</div>
                  </div>
                </div>
              }
              items={[
                { key: 'profile', label: 'Thông tin cá nhân', icon: <UserCircleIcon className="h-4 w-4" />, onClick: openProfile },
                { key: 'logout', label: 'Đăng xuất', icon: <ArrowRightOnRectangleIcon className="h-4 w-4" />, danger: true, onClick: onLogout }
              ]}
            />
          </div>
        </div>
      </div>

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Hướng dẫn sử dụng" footer={<Button variant="primary" onClick={() => setHelpOpen(false)}>Đóng</Button>}>
        <div className="space-y-4 text-sm text-slate-700">
          <p className="text-slate-600">Quy trình làm bài:</p>
          <ol className="list-inside list-decimal space-y-1.5 pl-1 text-slate-700">
            <li>Nếu nhiệm vụ yêu cầu dự đoán trước đọc, hoàn thành và nộp V0.</li>
            <li>Đọc ngữ liệu, viết theo các trục thi pháp và nộp V1.</li>
            <li>Nhận phản hồi gợi ý định hướng để tiếp tục suy nghĩ và hoàn thiện.</li>
            <li>Giáo viên xem góp ý đã gửi và có thể bổ sung nhận xét.</li>
            <li>Học sinh sửa bài, nộp V2 hoặc bản tiếp theo và ghi lí do thay đổi.</li>
            <li>Sau bản chỉnh sửa, học sinh hoàn thành REF1; giáo viên chấm Rubric.</li>
          </ol>
          <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">Phím tắt: <strong>Ctrl + K</strong> để tìm nhanh; <strong>Esc</strong> để đóng hộp thoại.</div>
        </div>
      </Modal>

      <Modal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Thông tin cá nhân"
        footer={<div className="flex gap-2"><Button variant="outline" onClick={() => setProfileOpen(false)}>Hủy</Button><Button variant="primary" isLoading={saving} onClick={save}>Lưu thay đổi</Button></div>}
      >
        <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1 text-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Avatar name={currentUser.name || 'Người dùng'} size="lg" />
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900">{currentUser.name}</div>
              <div className="truncate text-xs text-slate-500">{currentUser.email}</div>
              <div className="mt-1 text-xs text-slate-600">{ROLE_LABELS[currentUser.role] || currentUser.role}{currentUser.className && ` · Lớp ${currentUser.className}`}</div>
            </div>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Thông tin chung</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Họ và tên" value={form.name} onChange={v => change('name', v)} />
              <Field label="Email đăng nhập" value={currentUser.email} onChange={() => {}} readOnly />
              <Field label="Số điện thoại" value={form.phone} onChange={v => change('phone', v)} placeholder="09xxxxxxxx" />
              <Field label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={v => change('dateOfBirth', v)} />
              <Field label="Trường / Đơn vị" value={form.school} onChange={v => change('school', v)} placeholder="Tên trường" />
              <Field label="Năm học" value={form.schoolYear} onChange={v => change('schoolYear', v)} placeholder="2026-2027" />
              <Field label="Lớp được phân công" value={currentUser.className || 'Chưa gán lớp'} onChange={() => {}} readOnly />
              <Field label="Khối học" value={form.grade} onChange={v => change('grade', v)} placeholder="Khối 11" />
              {currentUser.role === 'student' ? <Field label="Mã học sinh" value={form.studentCode} onChange={v => change('studentCode', v)} /> : <Field label="Mã cán bộ / giáo viên" value={form.staffCode} onChange={v => change('staffCode', v)} />}
              <Field label="Tổ / Bộ môn" value={form.department} onChange={v => change('department', v)} placeholder="Tổ Ngữ văn" />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Sở thích & Mục tiêu</h3>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Mục tiêu môn học</span>
              <textarea rows={3} value={form.learningGoal} onChange={e => change('learningGoal', e.target.value)} className={`${fieldClass()} resize-y`} placeholder="Ví dụ: Rèn kĩ năng phân tích dẫn chứng, liên hệ bối cảnh..." />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Giới thiệu ngắn</span>
              <textarea rows={3} value={form.bio} onChange={e => change('bio', e.target.value)} className={`${fieldClass()} resize-y`} placeholder="Đôi nét về bản thân và cách học tập yêu thích..." />
            </label>
            <Field label="Thể loại yêu thích" value={form.favoriteGenres} onChange={v => change('favoriteGenres', v)} placeholder="Truyện ngắn, thơ..." />
            <Field label="Tác giả yêu thích" value={form.favoriteAuthors} onChange={v => change('favoriteAuthors', v)} placeholder="Kim Lân, Nam Cao..." />
            <Field label="Tác phẩm yêu thích" value={form.favoriteWorks} onChange={v => change('favoriteWorks', v)} placeholder="Vợ nhặt, Lão Hạc..." />
          </section>

          <div className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <div>Lần đăng nhập gần nhất: {lastLogin}</div>
            <div>Mã tài khoản: {currentUser.id}</div>
          </div>
        </div>
      </Modal>
    </header>
  );
};