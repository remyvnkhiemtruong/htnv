import { learningText, readableAcademicData } from '../../utils/learningLabels';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcademicClass,
  AiReviewRequest,
  Assignment,
  FeedbackItem,
  LiteratureText,
  RubricAssessmentSubmission,
  RubricMatrix,
  StudentPortfolio
} from '../../types';

export interface TeacherReflectionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  versionId: string;
  versionNumber: string;
  reflection: {
    changedUnderstanding: string;
    mostUsefulFeedback: string;
    incompleteInV1: string;
    improvedInV2: string;
    transferToNextReading: string;
  };
  createdAt: string;
}

export interface TeacherAcademicOverview {
  assignments: Assignment[];
  literatureTexts: LiteratureText[];
  rubric: RubricMatrix;
  rubrics: Record<string, RubricMatrix>;
  portfolios: Record<string, StudentPortfolio>;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  auditLogs: [];
  classes: AcademicClass[];
  users: [];
  aiReviews: AiReviewRequest[];
  reflections: TeacherReflectionRecord[];
}

export interface TeacherWorkspace {
  assignment: Assignment;
  literatureText: LiteratureText | null;
  portfolio: StudentPortfolio;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  aiReviews: AiReviewRequest[];
  reflections: TeacherReflectionRecord[];
  rubric: RubricMatrix;
}

export const teacherAcademicKeys = {
  all: ['teacher-academic'] as const,
  overview: (userId: string) => ['teacher-academic', userId, 'overview'] as const,
  workspace: (userId: string, assignmentId: string, studentId: string) => ['teacher-academic', userId, 'workspace', assignmentId, studentId] as const,
  literature: (userId: string) => ['teacher-academic', userId, 'literature'] as const
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(learningText(data.message || 'Không thể tải dữ liệu'));
  return readableAcademicData(data) as T;
}

export async function postTeacherAcademicAction(payload: unknown) {
  const response = await fetch('/api/academic/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(learningText(data.message || 'Không thể cập nhật dữ liệu'));
  return data;
}

export function useTeacherOverviewQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: teacherAcademicKeys.overview(userId),
    enabled,
    queryFn: async () => {
      const data = await getJson<{ overview: TeacherAcademicOverview }>('/api/teacher/overview');
      return data.overview;
    },
    staleTime: 30_000
  });
}

export function useTeacherWorkspaceQuery(userId: string, assignmentId: string, studentId: string, enabled = true) {
  return useQuery({
    queryKey: teacherAcademicKeys.workspace(userId, assignmentId, studentId),
    enabled: enabled && Boolean(assignmentId) && Boolean(studentId),
    queryFn: async () => {
      const params = new URLSearchParams({ assignmentId, studentId });
      const data = await getJson<{ workspace: TeacherWorkspace }>(`/api/teacher/workspace?${params.toString()}`);
      return data.workspace;
    },
    staleTime: 0,
    refetchOnMount: 'always'
  });
}

export function useTeacherLiteratureQuery(userId: string, enabled = true) {
  return useQuery({
    queryKey: teacherAcademicKeys.literature(userId),
    enabled,
    queryFn: async () => {
      const data = await getJson<{ literatureTexts: LiteratureText[] }>('/api/teacher/literature');
      return data.literatureTexts;
    },
    staleTime: 60_000
  });
}

export function useTeacherAcademicAction(userId: string, assignmentId?: string, studentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postTeacherAcademicAction,
    onSuccess: async () => {
      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: teacherAcademicKeys.overview(userId) })
      ];
      if (assignmentId && studentId) {
        invalidations.push(queryClient.invalidateQueries({
          queryKey: teacherAcademicKeys.workspace(userId, assignmentId, studentId)
        }));
      }
      await Promise.all(invalidations);
    }
  });
}

export function useTeacherCatalogMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const response = await fetch('/api/academic/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.code || 'Không thể cập nhật danh mục');
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teacherAcademicKeys.overview(userId) }),
        queryClient.invalidateQueries({ queryKey: teacherAcademicKeys.literature(userId) })
      ]);
    }
  });
}
