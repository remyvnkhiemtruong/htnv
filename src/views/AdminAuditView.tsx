import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Drawer,
  FilterBar,
  Input,
  Modal,
  Pagination,
  Tabs
} from '../components/ui';
import type { UserRole } from '../types';
import {
  adminKeys,
  type AdminClass,
  type AdminClassMember,
  type AdminUser,
  type AdminUserProfile,
  useAdminAuditQuery,
  useAdminClassMembersQuery,
  useAdminClassesQuery,
  useAdminMutation,
  useAdminStatsQuery,
  useAdminUsersQuery
} from '../app/queries/adminManagementQueries';
import { useQueryClient } from '@tanstack/react-query';
import { AdminUserImportModal } from './admin/AdminUserImportModal';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface AdminAuditViewProps {
  onNavigate: (view: string, extraParams?: any) => void;
}

const roles: UserRole[] = ['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'];
const labels: Record<UserRole, string> = {
  student: 'Học sinh',
  teacher: 'Giáo viên',
  peer: 'Phản biện',
  researcher: 'Nghiên cứu',
  admin: 'Quản trị',
  ai: 'AI'
};

type FullProfile = Required<Pick<AdminUserProfile,
  'phone' | 'dateOfBirth' | 'school' | 'schoolYear' | 'grade' | 'studentCode' | 'staffCode' | 'department'
>> & {
  bio: string;
  learningGoal: string;
};

const emptyProfile = (): FullProfile => ({
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

const normalizeProfile = (profile?: AdminUserProfile): FullProfile => ({
  ...emptyProfile(),
  ...(profile || {})
});

const fmt = (value?: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—';

const selectClassName = "min-h-9 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-500";

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({ onNavigate: _onNavigate }) => {
  const queryClient = useQueryClient();
  const mutation = useAdminMutation();
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'logs'>('users');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const deferredUserSearch = useDeferredValue(userSearch);
  const [userRole, setUserRole] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [userClass, setUserClass] = useState('');
  const [userPage, setUserPage] = useState(1);

  const [classSearch, setClassSearch] = useState('');
  const deferredClassSearch = useDeferredValue(classSearch);
  const [classYearFilter, setClassYearFilter] = useState('');
  const [classPage, setClassPage] = useState(1);

  const [auditSearch, setAuditSearch] = useState('');
  const deferredAuditSearch = useDeferredValue(auditSearch);
  const [auditAction, setAuditAction] = useState('');
  const [auditTarget, setAuditTarget] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  const usersQuery = useAdminUsersQuery({
    page: userPage,
    q: deferredUserSearch,
    role: userRole,
    status: userStatus,
    classCode: userClass
  });
  const classesQuery = useAdminClassesQuery({
    page: classPage,
    q: deferredClassSearch,
    schoolYear: classYearFilter
  });
  const auditQuery = useAdminAuditQuery({
    page: auditPage,
    q: deferredAuditSearch,
    action: auditAction,
    targetType: auditTarget
  });
  const statsQuery = useAdminStatsQuery();

  const users = usersQuery.data?.users || [];
  const classes = classesQuery.data?.classes || [];
  const logs = auditQuery.data?.logs || [];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedClass, setSelectedClass] = useState<AdminClass | null>(null);
  const membersQuery = useAdminClassMembersQuery(selectedClass?.code || '', Boolean(selectedClass));

  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isAssignMemberOpen, setIsAssignMemberOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newClassCode, setNewClassCode] = useState('');
  const [newProfile, setNewProfile] = useState<FullProfile>(() => emptyProfile());
  const [newPassword, setNewPassword] = useState('');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('student');
  const [editStatus, setEditStatus] = useState<'active' | 'locked'>('active');
  const [editProfile, setEditProfile] = useState<FullProfile>(() => emptyProfile());
  const [tempPassword, setTempPassword] = useState('');

  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [editClassCode, setEditClassCode] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editClassYear, setEditClassYear] = useState('');

  const [assignSearch, setAssignSearch] = useState('');
  const deferredAssignSearch = useDeferredValue(assignSearch);
  const [assignRole, setAssignRole] = useState<'student' | 'teacher'>('student');
  const [assignClassCode, setAssignClassCode] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const assignUsersQuery = useAdminUsersQuery({
    page: 1,
    pageSize: 30,
    q: deferredAssignSearch,
    role: assignRole,
    status: 'active'
  });

  const working = mutation.isPending;
  const queryError = [usersQuery.error, classesQuery.error, auditQuery.error, statsQuery.error]
    .find(Boolean);
  const visibleError = localError || (queryError instanceof Error ? queryError.message : '');

  const clearNotices = () => {
    setMessage('');
    setLocalError('');
  };

  const mutate = async <T = any>(payload: unknown): Promise<T> => {
    clearNotices();
    try {
      return await mutation.mutateAsync(payload) as T;
    } catch (error) {
      const value = error instanceof Error ? error.message : 'Không thể hoàn tất thao tác.';
      setLocalError(value);
      throw error;
    }
  };

  const refreshAll = async () => {
    clearNotices();
    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };

  const openUser = (user: AdminUser) => {
    clearNotices();
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditStatus(user.account_status);
    setEditProfile(normalizeProfile(user.profile_json));
    setTempPassword('');
  };

  const saveUser = async () => {
    if (!selectedUser) return;
    await mutate({
      action: 'update_user',
      userId: selectedUser.id,
      name: editName,
      email: editEmail,
      role: editRole,
      accountStatus: editStatus,
      profile: editProfile
    });
    setMessage('Đã cập nhật hồ sơ tài khoản.');
    setSelectedUser(null);
  };

  const resetPassword = async () => {
    if (!selectedUser) return;
    const result = await mutate<{ temporaryPassword: string }>({
      action: 'reset_password',
      userId: selectedUser.id
    });
    setTempPassword(result.temporaryPassword);
    setMessage('Đã tạo mật khẩu tạm mới.');
  };

  const createUser = async () => {
    const result = await mutate<{ temporaryPassword: string }>({
      action: 'create_user',
      name: newName,
      email: newEmail,
      role: newRole,
      classCode: newClassCode || undefined,
      profile: newProfile
    });
    setNewPassword(result.temporaryPassword);
    setMessage('Đã tạo tài khoản. Hãy lưu mật khẩu tạm trước khi đóng.');
  };

  const resetCreateUser = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('student');
    setNewClassCode('');
    setNewProfile(emptyProfile());
    setNewPassword('');
  };

  const createClass = async () => {
    await mutate({ action: 'create_class', code: classCode, name: className, schoolYear });
    setMessage('Đã lưu lớp học.');
    setClassCode('');
    setClassName('');
    setIsCreateClassOpen(false);
  };

  const openClass = (item: AdminClass) => {
    clearNotices();
    setSelectedClass(item);
    setEditClassCode(item.code);
    setEditClassName(item.name);
    setEditClassYear(item.school_year);
  };

  const updateClass = async () => {
    if (!selectedClass) return;
    await mutate({
      action: 'update_class',
      classId: selectedClass.id,
      code: editClassCode,
      name: editClassName,
      schoolYear: editClassYear
    });
    setMessage('Đã cập nhật lớp học.');
    setSelectedClass(prev => prev ? { ...prev, code: editClassCode, name: editClassName, school_year: editClassYear } : null);
  };

  const removeMember = async (member: AdminClassMember) => {
    if (!selectedClass) return;
    await mutate({ action: 'remove_member', classCode: selectedClass.code, userId: member.id });
    setMessage('Đã gỡ thành viên khỏi lớp.');
    await membersQuery.refetch();
  };

  const openAssign = (options?: { user?: AdminUser; classItem?: AdminClass }) => {
    const user = options?.user;
    const classItem = options?.classItem;
    if (options) setSelectedIds(new Set());
    setAssignUserId(user?.id || '');
    setAssignSearch(user?.email || '');
    setAssignRole(user?.role === 'teacher' ? 'teacher' : 'student');
    setAssignClassCode(classItem?.code || user?.class_codes?.[0] || classes[0]?.code || '');
    setIsAssignMemberOpen(true);
  };

  const assignMember = async () => {
    if (!assignUserId || !assignClassCode) return;
    await mutate({
      action: 'assign_member',
      userId: assignUserId,
      classCode: assignClassCode,
      memberRole: assignRole
    });
    setMessage('Đã gán thành viên vào lớp.');
    setIsAssignMemberOpen(false);
    if (selectedClass) await membersQuery.refetch();
  };

  const bulkStatus = async (status: 'active' | 'locked') => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const result = await mutate<{ count: number }>({
      action: 'bulk_update_status',
      userIds: ids,
      accountStatus: status
    });
    setMessage('Đã cập nhật ' + result.count + ' tài khoản.');
    setSelectedIds(new Set());
  };

  const bulkAssign = async () => {
    const ids = [...selectedIds];
    if (!ids.length || !assignClassCode) return;
    const result = await mutate<{ assigned: number; skipped: unknown[] }>({
      action: 'bulk_assign_class',
      userIds: ids,
      classCode: assignClassCode,
      memberRole: assignRole
    });
    setMessage('Đã gán ' + result.assigned + ' tài khoản; bỏ qua ' + result.skipped.length + ' tài khoản không phù hợp.');
    setSelectedIds(new Set());
    setIsAssignMemberOpen(false);
  };

  const allVisibleSelected = users.length > 0 && users.every(user => selectedIds.has(user.id));
  const toggleAll = () => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (allVisibleSelected) users.forEach(user => next.delete(user.id));
      else users.forEach(user => next.add(user.id));
      return next;
    });
  };

  useEffect(() => {
    setUserPage(1);
  }, [deferredUserSearch, userRole, userStatus, userClass]);
  useEffect(() => {
    setClassPage(1);
  }, [deferredClassSearch, classYearFilter]);
  useEffect(() => {
    setAuditPage(1);
  }, [deferredAuditSearch, auditAction, auditTarget]);

  const classYears = useMemo(() => {
    const years = new Set(classes.map(item => item.school_year).filter(Boolean));
    years.add('2026-2027');
    return [...years].sort().reverse();
  }, [classes]);

  const userColumns = [
    {
      key: 'select',
      header: <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Chọn tất cả tài khoản đang hiển thị" />,
      render: (user: AdminUser) => (
        <input
          type="checkbox"
          checked={selectedIds.has(user.id)}
          onClick={event => event.stopPropagation()}
          onChange={() => setSelectedIds(current => {
            const next = new Set(current);
            if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
            return next;
          })}
          aria-label={'Chọn ' + user.name}
        />
      )
    },
    { key: 'name', header: 'Họ và tên', render: (user: AdminUser) => <div><div className="font-semibold text-slate-900">{user.name}</div><div className="mt-0.5 text-slate-500">{user.email}</div></div> },
    { key: 'role', header: 'Vai trò', render: (user: AdminUser) => <Badge variant="outline" size="sm">{labels[user.role]}</Badge> },
    {
      key: 'identity',
      header: 'Mã / lớp',
      render: (user: AdminUser) => (
        <div>
          <div className="font-medium text-slate-800">{user.role === 'student' ? (user.profile_json?.studentCode || '—') : (user.profile_json?.staffCode || '—')}</div>
          <div className="mt-0.5 text-slate-500">{user.class_name || 'Chưa gán lớp'}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (user: AdminUser) => (
        <div className="space-y-1">
          <Badge variant={user.account_status === 'locked' ? 'rose' : 'emerald'} size="sm">{user.account_status === 'locked' ? 'Đã khóa' : 'Hoạt động'}</Badge>
          {user.must_change_password && <div className="text-amber-700">Cần đổi mật khẩu</div>}
        </div>
      )
    },
    { key: 'last_login', header: 'Đăng nhập gần nhất', render: (user: AdminUser) => <span className="text-slate-500">{fmt(user.last_login)}</span> }
  ];

  const classColumns = [
    { key: 'code', header: 'Mã lớp', render: (item: AdminClass) => <span className="font-mono font-semibold text-slate-900">{item.code}</span> },
    { key: 'name', header: 'Tên lớp', render: (item: AdminClass) => <div className="font-medium text-slate-900">{item.name}</div> },
    { key: 'school_year', header: 'Năm học' },
    { key: 'students', header: 'Học sinh', render: (item: AdminClass) => <span>{item.student_count || 0}</span> },
    { key: 'teachers', header: 'Giáo viên', render: (item: AdminClass) => <span>{item.teacher_count || 0}</span> },
    { key: 'assignments', header: 'Nhiệm vụ', render: (item: AdminClass) => <span>{item.assignment_count || 0}</span> }
  ];

  const auditColumns = [
    { key: 'timestamp', header: 'Thời gian', render: (row: any) => <span className="whitespace-nowrap text-slate-500">{fmt(row.timestamp)}</span> },
    { key: 'actor', header: 'Người thực hiện', render: (row: any) => <div><div className="font-medium text-slate-900">{row.actorName}</div><div className="text-slate-500">{row.actorEmail || row.actorRole}</div></div> },
    { key: 'action', header: 'Thao tác', render: (row: any) => <span className="font-mono text-slate-800">{row.action}</span> },
    { key: 'target', header: 'Đối tượng', render: (row: any) => <span className="text-slate-600">{row.target}</span> }
  ];

  const stats = statsQuery.data?.stats;

  return (
    <div className="max-w-7xl space-y-5 pb-16">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quản trị nhà trường</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý tài khoản, lớp học, phân công thành viên và nhật ký vận hành.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => void refreshAll()} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>Tải lại</Button>
          <Button size="sm" variant="outline" onClick={() => setIsImportOpen(true)} leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}>Nhập Excel/CSV</Button>
          <Button size="sm" variant="outline" onClick={() => setIsCreateClassOpen(true)}>Thêm lớp</Button>
          <Button size="sm" variant="primary" onClick={() => { resetCreateUser(); setIsCreateUserOpen(true); }}>Tạo tài khoản</Button>
        </div>
      </div>

      {visibleError && <Alert type="error" title="Lỗi">{visibleError}</Alert>}
      {message && <Alert type="success" title="Thông báo">{message}</Alert>}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Tài khoản', stats.users],
            ['Học sinh', stats.students],
            ['Giáo viên', stats.teachers],
            ['Lớp học', stats.classes],
            ['Đang khóa', stats.locked_users]
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs
        activeId={activeTab}
        onChange={id => setActiveTab(id as typeof activeTab)}
        items={[
          { id: 'users', label: 'Tài khoản', count: usersQuery.data?.pagination.total },
          { id: 'classes', label: 'Lớp học', count: classesQuery.data?.pagination.total },
          { id: 'logs', label: 'Nhật ký', count: auditQuery.data?.pagination.total }
        ]}
      />

      {activeTab === 'users' && (
        <div className="space-y-3">
          <FilterBar
            searchQuery={userSearch}
            onSearchChange={setUserSearch}
            searchPlaceholder="Tên, email, mã học sinh, SĐT..."
            activeFilterCount={[userRole, userStatus, userClass].filter(Boolean).length}
            onResetFilters={() => { setUserRole(''); setUserStatus(''); setUserClass(''); }}
            filters={
              <>
                <select className={selectClassName} value={userRole} onChange={e => setUserRole(e.target.value)}>
                  <option value="">Tất cả vai trò</option>
                  {roles.map(role => <option key={role} value={role}>{labels[role]}</option>)}
                </select>
                <select className={selectClassName} value={userStatus} onChange={e => setUserStatus(e.target.value)}>
                  <option value="">Mọi trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>
                <select className={selectClassName} value={userClass} onChange={e => setUserClass(e.target.value)}>
                  <option value="">Tất cả lớp</option>
                  {classes.map(item => <option key={item.id} value={item.code}>{item.code}</option>)}
                </select>
              </>
            }
          />

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <strong className="text-slate-900">Đã chọn {selectedIds.size} tài khoản</strong>
              <Button size="sm" variant="outline" onClick={() => void bulkStatus('active')} disabled={working}>Mở khóa</Button>
              <Button size="sm" variant="outline" onClick={() => void bulkStatus('locked')} disabled={working}>Khóa</Button>
              <Button size="sm" variant="outline" onClick={() => openAssign()}>Gán vào lớp</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</Button>
            </div>
          )}

          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <DataTable
              columns={userColumns}
              data={users}
              keyExtractor={row => row.id}
              isLoading={usersQuery.isLoading}
              emptyMessage="Không có tài khoản phù hợp."
              onRowClick={openUser}
            />
            <Pagination
              currentPage={usersQuery.data?.pagination.page || 1}
              totalPages={usersQuery.data?.pagination.totalPages || 1}
              onPageChange={setUserPage}
            />
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-3">
          <FilterBar
            searchQuery={classSearch}
            onSearchChange={setClassSearch}
            searchPlaceholder="Tìm mã hoặc tên lớp..."
            activeFilterCount={classYearFilter ? 1 : 0}
            onResetFilters={() => setClassYearFilter('')}
            filters={
              <select className={selectClassName} value={classYearFilter} onChange={e => setClassYearFilter(e.target.value)}>
                <option value="">Tất cả năm học</option>
                {classYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            }
          />
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <DataTable
              columns={classColumns}
              data={classes}
              keyExtractor={row => row.id}
              isLoading={classesQuery.isLoading}
              emptyMessage="Chưa có lớp học phù hợp."
              onRowClick={openClass}
            />
            <Pagination
              currentPage={classesQuery.data?.pagination.page || 1}
              totalPages={classesQuery.data?.pagination.totalPages || 1}
              onPageChange={setClassPage}
            />
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-3">
          <FilterBar
            searchQuery={auditSearch}
            onSearchChange={setAuditSearch}
            searchPlaceholder="Người thực hiện, thao tác, đối tượng..."
            activeFilterCount={[auditAction, auditTarget].filter(Boolean).length}
            onResetFilters={() => { setAuditAction(''); setAuditTarget(''); }}
            filters={
              <>
                <Input value={auditAction} onChange={e => setAuditAction(e.target.value)} placeholder="Mã thao tác" className="w-48" />
                <select className={selectClassName} value={auditTarget} onChange={e => setAuditTarget(e.target.value)}>
                  <option value="">Mọi đối tượng</option>
                  <option value="user">Tài khoản</option>
                  <option value="class">Lớp học</option>
                  <option value="class_member">Thành viên lớp</option>
                  <option value="user_batch">Lô tài khoản</option>
                  <option value="class_member_batch">Lô phân công</option>
                </select>
              </>
            }
          />
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <DataTable
              columns={auditColumns}
              data={logs}
              keyExtractor={row => row.id}
              isLoading={auditQuery.isLoading}
              emptyMessage="Không có sự kiện phù hợp."
            />
            <Pagination
              currentPage={auditQuery.data?.pagination.page || 1}
              totalPages={auditQuery.data?.pagination.totalPages || 1}
              onPageChange={setAuditPage}
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        title="Tạo tài khoản mới"
        description="Tạo hồ sơ, gán vai trò và có thể đưa người dùng vào lớp ngay."
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCreateUserOpen(false)}>Đóng</Button>
            <Button size="sm" variant="primary" onClick={() => void createUser()} isLoading={working} disabled={!newName.trim() || !newEmail.includes('@')}>Tạo tài khoản</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Họ và tên *" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input label="Email *" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Vai trò</label>
              <select
                className="w-full rounded-md border border-slate-300 p-2 text-sm"
                value={newRole}
                onChange={e => {
                  const role = e.target.value as UserRole;
                  setNewRole(role);
                  if (!['student','teacher'].includes(role)) setNewClassCode('');
                }}
              >
                {roles.map(role => <option key={role} value={role}>{labels[role]}</option>)}
              </select>
            </div>
            {['student','teacher'].includes(newRole) && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Lớp</label>
                <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={newClassCode} onChange={e => setNewClassCode(e.target.value)}>
                  <option value="">Chưa gán lớp</option>
                  {classes.map(item => <option key={item.id} value={item.code}>{item.code} — {item.name}</option>)}
                </select>
              </div>
            )}
            <Input label="Số điện thoại" value={newProfile.phone} onChange={e => setNewProfile(p => ({ ...p, phone: e.target.value }))} />
            <Input label="Ngày sinh" type="date" value={newProfile.dateOfBirth} onChange={e => setNewProfile(p => ({ ...p, dateOfBirth: e.target.value }))} />
            <Input label="Trường / đơn vị" value={newProfile.school} onChange={e => setNewProfile(p => ({ ...p, school: e.target.value }))} />
            <Input label="Năm học" value={newProfile.schoolYear} onChange={e => setNewProfile(p => ({ ...p, schoolYear: e.target.value }))} />
            {newRole === 'student' ? (
              <>
                <Input label="Mã học sinh" value={newProfile.studentCode} onChange={e => setNewProfile(p => ({ ...p, studentCode: e.target.value }))} />
                <Input label="Khối" value={newProfile.grade} onChange={e => setNewProfile(p => ({ ...p, grade: e.target.value }))} />
              </>
            ) : (
              <>
                <Input label="Mã cán bộ / người dùng" value={newProfile.staffCode} onChange={e => setNewProfile(p => ({ ...p, staffCode: e.target.value }))} />
                <Input label="Tổ / bộ môn" value={newProfile.department} onChange={e => setNewProfile(p => ({ ...p, department: e.target.value }))} />
              </>
            )}
          </div>
          {newPassword && (
            <Alert type="success" title="Tài khoản đã được tạo">
              <div className="mt-2 text-xs">Mật khẩu tạm:</div>
              <div className="mt-1 select-all rounded border border-emerald-200 bg-white p-2 font-mono font-semibold">{newPassword}</div>
            </Alert>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        title="Thêm lớp học"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCreateClassOpen(false)}>Hủy</Button>
            <Button size="sm" variant="primary" onClick={() => void createClass()} isLoading={working} disabled={!classCode.trim() || !className.trim()}>Lưu lớp</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="Mã lớp" value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())} placeholder="12A1" />
          <Input label="Tên lớp" value={className} onChange={e => setClassName(e.target.value)} placeholder="Lớp 12A1" />
          <Input label="Năm học" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
        </div>
      </Modal>

      <Modal
        isOpen={isAssignMemberOpen}
        onClose={() => setIsAssignMemberOpen(false)}
        title={selectedIds.size > 0 && !assignUserId ? 'Gán nhiều tài khoản vào lớp' : 'Gán thành viên vào lớp'}
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsAssignMemberOpen(false)}>Hủy</Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void (selectedIds.size > 0 && !assignUserId ? bulkAssign() : assignMember())}
              isLoading={working}
              disabled={!assignClassCode || (selectedIds.size === 0 && !assignUserId)}
            >
              Xác nhận
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Vai trò trong lớp</label>
            <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={assignRole} onChange={e => { setAssignRole(e.target.value as 'student' | 'teacher'); setAssignUserId(''); }}>
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
            </select>
          </div>
          {selectedIds.size === 0 || assignUserId ? (
            <>
              <Input label="Tìm người dùng" value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Tên hoặc email..." />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Người dùng</label>
                <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                  <option value="">Chọn người dùng</option>
                  {(assignUsersQuery.data?.users || []).map(item => <option key={item.id} value={item.id}>{item.name} — {item.email}</option>)}
                </select>
              </div>
            </>
          ) : (
            <Alert type="info" title={'Đang gán ' + selectedIds.size + ' tài khoản'}>
              Chỉ các tài khoản đang hoạt động và có đúng vai trò đã chọn mới được gán; tài khoản không phù hợp sẽ được bỏ qua.
            </Alert>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Lớp học</label>
            <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={assignClassCode} onChange={e => setAssignClassCode(e.target.value)}>
              <option value="">Chọn lớp</option>
              {classes.map(item => <option key={item.id} value={item.code}>{item.code} — {item.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <Drawer
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? 'Hồ sơ — ' + selectedUser.name : 'Hồ sơ tài khoản'}
        width="xl"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setSelectedUser(null)}>Đóng</Button>
            <Button size="sm" variant="primary" onClick={() => void saveUser()} isLoading={working}>Lưu thay đổi</Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Họ và tên" value={editName} onChange={e => setEditName(e.target.value)} />
              <Input label="Email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Vai trò</label>
                <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}>
                  {roles.map(role => <option key={role} value={role}>{labels[role]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Trạng thái</label>
                <select className="w-full rounded-md border border-slate-300 p-2 text-sm" value={editStatus} onChange={e => setEditStatus(e.target.value as 'active' | 'locked')}>
                  <option value="active">Hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>
              </div>
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
                  <Input label="Mã cán bộ" value={editProfile.staffCode} onChange={e => setEditProfile(p => ({ ...p, staffCode: e.target.value }))} />
                  <Input label="Tổ / bộ môn" value={editProfile.department} onChange={e => setEditProfile(p => ({ ...p, department: e.target.value }))} />
                </>
              )}
            </div>

            <div className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">Phân công lớp</div>
                  <div className="mt-0.5 text-slate-500">{selectedUser.class_name || 'Chưa được gán vào lớp'}</div>
                </div>
                {['student','teacher'].includes(selectedUser.role) && (
                  <Button size="sm" variant="outline" onClick={() => openAssign({ user: selectedUser })} leftIcon={<UserGroupIcon className="h-4 w-4" />}>Gán lớp</Button>
                )}
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-center gap-2 font-semibold text-amber-900"><LockClosedIcon className="h-4 w-4" />Mật khẩu</div>
              <div className="mt-2"><Button size="sm" variant="outline" onClick={() => void resetPassword()} isLoading={working}>Tạo mật khẩu tạm mới</Button></div>
              {tempPassword && <div className="mt-2 select-all rounded border border-amber-200 bg-white p-2 font-mono font-semibold">{tempPassword}</div>}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3 text-xs">
              <div><span className="text-slate-500">Tạo:</span><div className="mt-0.5 font-medium">{fmt(selectedUser.created_at)}</div></div>
              <div><span className="text-slate-500">Đăng nhập cuối:</span><div className="mt-0.5 font-medium">{fmt(selectedUser.last_login)}</div></div>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={Boolean(selectedClass)}
        onClose={() => setSelectedClass(null)}
        title={selectedClass ? 'Lớp ' + selectedClass.code : 'Chi tiết lớp'}
        width="xl"
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => setSelectedClass(null)}>Đóng</Button>
            <Button size="sm" variant="primary" onClick={() => void updateClass()} isLoading={working}>Lưu lớp</Button>
          </>
        }
      >
        {selectedClass && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Mã lớp" value={editClassCode} onChange={e => setEditClassCode(e.target.value.toUpperCase())} />
              <Input label="Tên lớp" value={editClassName} onChange={e => setEditClassName(e.target.value)} />
              <Input label="Năm học" value={editClassYear} onChange={e => setEditClassYear(e.target.value)} />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <div className="font-semibold text-slate-900">Thành viên lớp</div>
                <div className="text-slate-500">{membersQuery.data?.members.length || 0} thành viên</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => openAssign({ classItem: selectedClass })}>Thêm thành viên</Button>
            </div>

            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {membersQuery.isLoading ? (
                <div className="p-5 text-center text-slate-500">Đang tải thành viên...</div>
              ) : (membersQuery.data?.members || []).length === 0 ? (
                <div className="p-5 text-center text-slate-500">Lớp chưa có thành viên.</div>
              ) : (membersQuery.data?.members || []).map(member => (
                <div key={member.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <div className="font-medium text-slate-900">{member.name}</div>
                    <div className="mt-0.5 text-slate-500">{member.email} · {member.member_role === 'student' ? 'Học sinh' : 'Giáo viên'}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => void removeMember(member)}>Gỡ khỏi lớp</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <AdminUserImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => void refreshAll()}
      />
    </div>
  );
};
