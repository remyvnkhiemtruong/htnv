import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '../../types';

export interface AdminUserProfile {
  phone?: string;
  dateOfBirth?: string;
  school?: string;
  schoolYear?: string;
  grade?: string;
  studentCode?: string;
  staffCode?: string;
  department?: string;
  bio?: string;
  learningGoal?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  account_status: 'active' | 'locked';
  must_change_password: boolean;
  created_at: string;
  updated_at?: string;
  last_login: string | null;
  profile_json?: AdminUserProfile;
  class_name?: string;
  class_names?: string[];
  class_codes?: string[];
}

export interface AdminClass {
  id: string;
  code: string;
  name: string;
  school_year: string;
  created_at?: string;
  updated_at?: string;
  student_count?: number;
  teacher_count?: number;
  assignment_count?: number;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actorEmail?: string | null;
  action: string;
  target: string;
  targetType?: string;
  targetId?: string;
  ipAddress: string;
  before?: unknown;
  after?: unknown;
}

export interface AdminClassMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  account_status: 'active' | 'locked';
  profile_json?: AdminUserProfile;
  member_role: 'student' | 'teacher';
  joined_at: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminStats {
  users: number;
  students: number;
  teachers: number;
  locked_users: number;
  classes: number;
  memberships: number;
  audit_events: number;
}

export const adminKeys = {
  all: ['admin-management'] as const,
  users: (params: Record<string, unknown>) => ['admin-management', 'users', params] as const,
  classes: (params: Record<string, unknown>) => ['admin-management', 'classes', params] as const,
  classMembers: (classCode: string) => ['admin-management', 'class-members', classCode] as const,
  audit: (params: Record<string, unknown>) => ['admin-management', 'audit', params] as const,
  stats: () => ['admin-management', 'stats'] as const
};

const params = (input: Record<string, unknown>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  return search.toString();
};

async function getAdmin<T>(input: Record<string, unknown>) {
  const response = await fetch(`/api/admin/users?${params(input)}`, {
    credentials: 'include',
    cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.code || 'Không thể tải dữ liệu quản trị');
  return data as T;
}

export async function adminAction<T = any>(payload: unknown): Promise<T> {
  const response = await fetch('/api/admin/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.code || 'Không thể cập nhật dữ liệu quản trị');
  return data as T;
}

export function useAdminUsersQuery(filters: {
  page: number;
  pageSize?: number;
  q?: string;
  role?: string;
  status?: string;
  classCode?: string;
}) {
  const query = { scope: 'users', pageSize: 30, ...filters };
  return useQuery({
    queryKey: adminKeys.users(query),
    queryFn: () => getAdmin<{ users: AdminUser[]; pagination: PaginationMeta }>(query),
    placeholderData: previous => previous,
    staleTime: 15_000
  });
}

export function useAdminClassesQuery(filters: {
  page: number;
  pageSize?: number;
  q?: string;
  schoolYear?: string;
}) {
  const query = { scope: 'classes', pageSize: 30, ...filters };
  return useQuery({
    queryKey: adminKeys.classes(query),
    queryFn: () => getAdmin<{ classes: AdminClass[]; pagination: PaginationMeta }>(query),
    placeholderData: previous => previous,
    staleTime: 30_000
  });
}

export function useAdminClassMembersQuery(classCode: string, enabled = true) {
  return useQuery({
    queryKey: adminKeys.classMembers(classCode),
    queryFn: () => getAdmin<{ class: AdminClass | null; members: AdminClassMember[] }>({
      scope: 'class-members',
      classCode
    }),
    enabled: enabled && Boolean(classCode),
    staleTime: 15_000
  });
}

export function useAdminAuditQuery(filters: {
  page: number;
  pageSize?: number;
  q?: string;
  action?: string;
  targetType?: string;
}) {
  const query = { scope: 'audit', pageSize: 50, ...filters };
  return useQuery({
    queryKey: adminKeys.audit(query),
    queryFn: () => getAdmin<{ logs: AdminAuditLog[]; pagination: PaginationMeta }>(query),
    placeholderData: previous => previous,
    staleTime: 10_000
  });
}

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => getAdmin<{ stats: AdminStats }>({ scope: 'stats' }),
    staleTime: 30_000
  });
}

export function useAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminAction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    }
  });
}
