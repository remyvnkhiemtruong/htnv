import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Assignment,
  FeedbackItem,
  LiteratureText,
  RubricAssessmentSubmission,
  RubricMatrix,
  StudentPortfolio
} from '../../types';

export interface StudentReflectionRecord {
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

export interface StudentAcademicOverview {
  assignments: Assignment[];
  literatureTexts: LiteratureText[];
  portfolios: Record<string, StudentPortfolio>;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  reflections: StudentReflectionRecord[];
}

export interface StudentWorkspace {
  assignment: Assignment;
  literatureText: LiteratureText | null;
  portfolio: StudentPortfolio;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  reflections: StudentReflectionRecord[];
  rubric: RubricMatrix;
}

export const studentAcademicKeys = {
  all: ['student-academic'] as const,
  overview: () => ['student-academic', 'overview'] as const,
  workspace: (assignmentId: string) => ['student-academic', 'workspace', assignmentId] as const
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.code || 'Không thể tải dữ liệu');
  return data as T;
}

export async function postAcademicAction(payload: unknown) {
  const response = await fetch('/api/academic/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.code || 'Không thể cập nhật dữ liệu');
  return data;
}

export function useStudentOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: studentAcademicKeys.overview(),
    enabled,
    queryFn: async () => {
      const data = await getJson<{ overview: StudentAcademicOverview }>('/api/student/overview');
      return data.overview;
    },
    staleTime: 60_000
  });
}

export function useStudentWorkspaceQuery(assignmentId: string, enabled = true) {
  return useQuery({
    queryKey: studentAcademicKeys.workspace(assignmentId),
    enabled: enabled && Boolean(assignmentId),
    queryFn: async () => {
      const data = await getJson<{ workspace: StudentWorkspace }>(
        `/api/student/workspace?assignmentId=${encodeURIComponent(assignmentId)}`
      );
      return data.workspace;
    },
    staleTime: 30_000
  });
}

export function useStudentAcademicAction(assignmentId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAcademicAction,
    onSuccess: async () => {
      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: studentAcademicKeys.overview() })
      ];
      if (assignmentId) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: studentAcademicKeys.workspace(assignmentId) }));
      }
      await Promise.all(invalidations);
    }
  });
}

export async function invalidateStudentAcademicData(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId?: string
) {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: studentAcademicKeys.overview() })
  ];
  if (assignmentId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: studentAcademicKeys.workspace(assignmentId) }));
  }
  await Promise.all(invalidations);
}
