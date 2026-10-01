import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Input, Modal, Tabs } from '../components/ui';
import type { AcademicClass, AuditLog, UserRole } from '../types';
import { ArrowPathIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface AdminAuditViewProps {
  onNavigate: (view: string, extraParams?: any) => void;
}

type UserProfile = {
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
};

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  account_status: 'active' | 'locked';
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
  class_name?: string;
  profile_json?: Partial<UserProfile>;
};

const emptyUserProfile = (): UserProfile => ({
  phone: '',
  dateOfBirth: '',
  school: '',
  schoolYear: '2026-2027',
  grade: '',
  studentCode: '',
  staffCode: '',
  department: '',
  bio: '',
  learningGoal: ''
});

const normalizeProfile = (profile?: Partial<UserProfile>): UserProfile => ({
  ...emptyUserProfile(),
  ...(profile || {})
});

const roles: UserRole[] = ['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'];
const labels: Record<UserRole, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  peer: 'Phản biện',
  researcher: 'Nghiên cứu',
  admin: 'Quản trị',
  ai: 'AI'
};

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString('vi-VN') : '—');

async function act(payload: unknown) {
  const r = await fetch('/api/admin/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.code || 'Không thể cập nhật');
  return d;
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({ onNavigate: _onNavigate }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs'>('users');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false);

  // Edit user modal
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>('active');
  const [tempPassword, setTempPassword] = useState('');

  // Create user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newPassword, setNewPassword] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newProfile, setNewProfile] = useState<UserProfile>(() => emptyUserProfile());

  // Detailed edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editProfile, setEditProfile] = useState<UserProfile>(() => emptyUserProfile());

  // Create class form
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');

  // Assign member form
  const [memberUser, setMemberUser] = useState('');
  const [memberClass, setMemberClass] = useState('');
  const [memberRole, setMemberRole] = useState<'student' | 'teacher'>('student');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, s] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/academic/snapshot', { credentials: 'include' })
      ]);
      const ud = await u.json();
      const sd = await s.json();
      if (!u.ok) throw new Error(ud.message || 'Không thể tải tài khoản');
      if (!s.ok) throw new Error(sd.message || 'Không thể tải dữ liệu');
      const nextUsers = ud.users || [];
      const nextClasses = sd.snapshot?.classes || [];
      setUsers(nextUsers);
      setClasses(nextClasses);
      setLogs(sd.snapshot?.auditLogs || []);
      setMemberUser(prev => (!prev && nextUsers[0] ? nextUsers[0].id : prev));
      setMemberClass(prev => (!prev && nextClasses[0] ? nextClasses[0].code : prev));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openUserModal = (u: AdminUser) => {
    setSelected(u);
    setEditRole(u.role);
    setEditStatus(u.account_status || 'active');
    setEditName(u.name);
    setEditEmail(u.email);
    setEditProfile(normalizeProfile(u.profile_json));
    setTempPassword('');
    setMessage(null);
  };

  const saveUser = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await act({
        action: 'update_user',
        userId: selected.id,
        name: editName,
        email: editEmail,
        role: editRole,
        accountStatus: editStatus,
        profile: editProfile
      });
      setMessage('Đã cập nhật thông tin tài khoản.');
      setSelected(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPass = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const d = await act({ action: 'reset_password', userId: selected.id });
      setTempPassword(d.temporaryPassword);
      setMessage('Đã tạo mật khẩu tạm.');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await act({
        action: 'create_user',
        name: newName,
        email: newEmail,
        role: newRole,
        classCode: newClassCode || undefined,
        profile: newProfile
      });
      setNewPassword(d.temporaryPassword);
      setMessage('Đã tạo tài khoản thành công.');
      setNewName('');
      setNewEmail('');
      setNewClassCode('');
      setNewProfile(emptyUserProfile());
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createClass = async () => {
    setLoading(true);
    try {
      await act({ action: 'create_class', code: classCode, name: className, schoolYear });
      setClassCode('');
      setClassName('');
      setMessage('Đã lưu lớp học.');
      setIsCreateClassOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const assignMember = async () => {
    setLoading(true);
    try {
      await act({ action: 'assign_member', classCode: memberClass, userId: memberUser, memberRole });
      setMessage('Đã phân công thành viên vào lớp.');
      setIsAssignMemberOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản trị hệ thống</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý tài khoản, cấu hình lớp học và theo dõi nhật ký hệ thống
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => void load()} isLoading={loading} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
            Tải lại
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAssignMemberOpen(true)}>
            Gán vào lớp
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreateClassOpen(true)}>
            Thêm lớp
          </Button>
          <Button size="sm" variant="primary" onClick={() => setIsCreateUserOpen(true)}>
            Tạo tài khoản
          </Button>
        </div>
      </div>

      {error && <Alert type="error" title="Lỗi">{error}</Alert>}
      {message && <Alert type="success" title="Thông báo">{message}</Alert>}

      {/* Underline Tabs */}
      <Tabs
        activeId={activeTab}
        onChange={id => setActiveTab(id as any)}
        items={[
          { id: 'users', label: 'Tài khoản', count: users.length },
          { id: 'classes', label: 'Lớp học', count: classes.length },
          { id: 'logs', label: 'Nhật ký hệ thống', count: logs.length }
        ]}
      />

      {/* Tab: Users Table */}
      {activeTab === 'users' && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <tr>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Mã / Lớp</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Đăng nhập gần nhất</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-medium text-slate-800">{labels[u.role]}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <div className="font-medium text-slate-800">
                        {u.role === 'student' ? (u.profile_json?.studentCode || '—') : (u.profile_json?.staffCode || '—')}
                      </div>
                      <div className="mt-0.5 text-slate-500">{u.class_name || 'Chưa gán lớp'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <Badge variant={u.account_status === 'locked' ? 'rose' : 'slate'} size="sm">
                        {u.account_status === 'locked' ? 'Đã khóa' : 'Hoạt động'}
                      </Badge>
                      {u.must_change_password && (
                        <span className="ml-2 text-amber-700 font-medium">Cần đổi mật khẩu</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">{fmt(u.last_login)}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openUserModal(u)}>
                        Quản lý
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Classes Table */}
      {activeTab === 'classes' && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <tr>
                  <th className="py-3 px-4">Mã lớp</th>
                  <th className="py-3 px-4">Tên lớp</th>
                  <th className="py-3 px-4">Năm học</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-slate-500">
                      Chưa có lớp học nào được tạo.
                    </td>
                  </tr>
                ) : (
                  classes.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900">{c.code}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{c.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{c.school_year}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Audit Logs Table */}
      {activeTab === 'logs' && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Thao tác</th>
                  <th className="py-3 px-4">Đối tượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                      Chưa có sự kiện nào trong nhật ký.
                    </td>
                  </tr>
                ) : (
                  logs.slice(0, 200).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 text-xs">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        {log.actorName} ({log.actorRole})
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-4 text-slate-600">{log.target}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateUserOpen}
        onClose={() => {
          setIsCreateUserOpen(false);
          setNewPassword('');
        }}
        title="Tạo tài khoản mới"
        description="Nhập thông tin hồ sơ ngay khi tạo tài khoản. Mật khẩu tạm chỉ hiển thị sau khi tạo và người dùng phải đổi ở lần đăng nhập đầu tiên."
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateUserOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={createUser}
              disabled={!newName.trim() || !newEmail.includes('@')}
              isLoading={loading}
            >
              Tạo tài khoản
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-sm">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Thông tin tài khoản</h3>
              <p className="mt-0.5 text-xs text-slate-500">Thông tin dùng để đăng nhập, phân quyền và hiển thị trong hệ thống.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Họ và tên *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoComplete="name"
                disableAutofill={false}
              />
              <Input
                label="Email *"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                autoComplete="email"
                disableAutofill={false}
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-[13px]">Vai trò *</label>
                <select
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-600/10"
                  value={newRole}
                  onChange={e => {
                    const role = e.target.value as UserRole;
                    setNewRole(role);
                    if (!['student', 'teacher'].includes(role)) setNewClassCode('');
                  }}
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{labels[r]}</option>
                  ))}
                </select>
              </div>
              {['student', 'teacher'].includes(newRole) && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-[13px]">
                    {newRole === 'student' ? 'Lớp học' : 'Lớp phụ trách'}
                  </label>
                  <select
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value)}
                    className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-600/10"
                  >
                    <option value="">Chưa gán lớp</option>
                    {classes.map(item => (
                      <option key={item.id} value={item.code}>{item.code} — {item.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Hồ sơ người dùng</h3>
              <p className="mt-0.5 text-xs text-slate-500">Có thể bổ sung hoặc chỉnh sửa lại sau trong phần quản lý tài khoản.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Số điện thoại"
                value={newProfile.phone}
                onChange={e => setNewProfile(p => ({ ...p, phone: e.target.value }))}
                inputMode="tel"
                autoComplete="tel"
                disableAutofill={false}
              />
              <Input
                label="Ngày sinh"
                type="date"
                value={newProfile.dateOfBirth}
                onChange={e => setNewProfile(p => ({ ...p, dateOfBirth: e.target.value }))}
                disableAutofill={false}
              />
              <Input
                label="Trường / đơn vị"
                value={newProfile.school}
                onChange={e => setNewProfile(p => ({ ...p, school: e.target.value }))}
              />
              <Input
                label="Năm học"
                value={newProfile.schoolYear}
                onChange={e => setNewProfile(p => ({ ...p, schoolYear: e.target.value }))}
                placeholder="2026-2027"
              />
              {newRole === 'student' ? (
                <>
                  <Input
                    label="Mã học sinh"
                    value={newProfile.studentCode}
                    onChange={e => setNewProfile(p => ({ ...p, studentCode: e.target.value }))}
                  />
                  <Input
                    label="Khối"
                    value={newProfile.grade}
                    onChange={e => setNewProfile(p => ({ ...p, grade: e.target.value }))}
                    placeholder="10, 11 hoặc 12"
                  />
                </>
              ) : (
                <>
                  <Input
                    label={newRole === 'teacher' ? 'Mã cán bộ / giáo viên' : 'Mã người dùng'}
                    value={newProfile.staffCode}
                    onChange={e => setNewProfile(p => ({ ...p, staffCode: e.target.value }))}
                  />
                  <Input
                    label="Tổ / bộ môn / đơn vị"
                    value={newProfile.department}
                    onChange={e => setNewProfile(p => ({ ...p, department: e.target.value }))}
                  />
                </>
              )}
            </div>
          </section>

          {newPassword && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
              <div className="text-xs font-semibold text-amber-900">Mật khẩu tạm thời — chỉ hiển thị lần này</div>
              <div className="mt-2 select-all rounded-md border border-amber-200 bg-white p-2.5 font-mono text-sm font-bold text-slate-900">
                {newPassword}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Create Class */}
      <Modal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        title="Thêm lớp học"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateClassOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={createClass} disabled={!classCode.trim() || !className.trim()}>
              Lưu lớp
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <Input label="Mã lớp (ví dụ: 11A2)" value={classCode} onChange={e => setClassCode(e.target.value)} />
          <Input label="Tên lớp (ví dụ: Lớp 11A2)" value={className} onChange={e => setClassName(e.target.value)} />
          <Input label="Năm học" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
        </div>
      </Modal>

      {/* Modal: Assign Member */}
      <Modal
        isOpen={isAssignMemberOpen}
        onClose={() => setIsAssignMemberOpen(false)}
        title="Phân công thành viên vào lớp"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAssignMemberOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={assignMember} disabled={!memberUser || !memberClass}>
              Xác nhận
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Người dùng</label>
            <select
              value={memberUser}
              onChange={e => setMemberUser(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-800 outline-none focus:border-slate-500"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} — {labels[u.role]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Lớp học</label>
            <select
              value={memberClass}
              onChange={e => setMemberClass(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-800 outline-none focus:border-slate-500"
            >
              {classes.map(c => (
                <option key={c.id} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Vai trò trong lớp</label>
            <select
              value={memberRole}
              onChange={e => setMemberRole(e.target.value as 'student' | 'teacher')}
              className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-800 outline-none focus:border-slate-500"
            >
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Tài khoản — ${selected.name}` : 'Quản lý tài khoản'}
        description={selected?.class_name ? `Lớp hiện tại: ${selected.class_name}` : 'Tài khoản chưa được gán vào lớp học.'}
        maxWidth="2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={saveUser}
              isLoading={loading}
              disabled={!editName.trim() || !editEmail.includes('@')}
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="space-y-5 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Họ và tên *" value={editName} onChange={e => setEditName(e.target.value)} />
            <Input label="Email *" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-[13px]">Vai trò</label>
              <select
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-600/10"
                value={editRole}
                onChange={e => setEditRole(e.target.value as UserRole)}
              >
                {roles.map(r => (
                  <option key={r} value={r}>{labels[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:text-[13px]">Trạng thái tài khoản</label>
              <select
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-600/10"
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as 'active' | 'locked')}
              >
                <option value="active">Hoạt động bình thường</option>
                <option value="locked">Khóa tài khoản</option>
              </select>
            </div>
          </div>

          <section className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Hồ sơ chi tiết</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Số điện thoại" value={editProfile.phone} onChange={e => setEditProfile(p => ({ ...p, phone: e.target.value }))} />
              <Input label="Ngày sinh" type="date" value={editProfile.dateOfBirth} onChange={e => setEditProfile(p => ({ ...p, dateOfBirth: e.target.value }))} />
              <Input label="Trường / đơn vị" value={editProfile.school} onChange={e => setEditProfile(p => ({ ...p, school: e.target.value }))} />
              <Input label="Năm học" value={editProfile.schoolYear} onChange={e => setEditProfile(p => ({ ...p, schoolYear: e.target.value }))} />
              {editRole === 'student' ? (
                <>
                  <Input label="Mã học sinh" value={editProfile.studentCode} onChange={e => setEditProfile(p => ({ ...p, studentCode: e.target.value }))} />
                  <Input label="Khối" value={editProfile.grade} onChange={e => setEditProfile(p => ({ ...p, grade: e.target.value }))} />
                </>
              ) : (
                <>
                  <Input label="Mã cán bộ / người dùng" value={editProfile.staffCode} onChange={e => setEditProfile(p => ({ ...p, staffCode: e.target.value }))} />
                  <Input label="Tổ / bộ môn / đơn vị" value={editProfile.department} onChange={e => setEditProfile(p => ({ ...p, department: e.target.value }))} />
                </>
              )}
            </div>
          </section>

          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-2">
            <div className="flex items-center gap-2 font-medium text-xs text-amber-900">
              <LockClosedIcon className="h-4 w-4" />
              <span>Cấp lại mật khẩu tạm</span>
            </div>
            <Button size="sm" variant="outline" onClick={resetPass} isLoading={loading}>
              Tạo mật khẩu mới
            </Button>
            {tempPassword && (
              <div className="select-all rounded border border-amber-200 bg-white p-2 font-mono text-sm font-bold text-slate-900">
                {tempPassword}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
