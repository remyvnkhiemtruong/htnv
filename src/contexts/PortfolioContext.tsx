import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AcademicSnapshot,
  StudentPortfolio,
  Assignment,
  LiteratureText,
  RubricMatrix,
  FeedbackItem,
  RubricAssessmentSubmission,
  AuditLog,
  PoeticAxisId,
  EvidenceQuote,
  AiReviewRequest,
  AcademicClass
} from '../types';
import { useAuth } from './AuthContext';
import { usePortfolioStore, type CreateSnapshotOptions } from '../app/store/usePortfolioStore';
import { mockDb } from '../services/mockApi/mockDb';
import { useTeacherOverviewQuery } from '../app/queries/teacherAcademicQueries';

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

interface PortfolioContextType {
  portfolios: Record<string, StudentPortfolio>;
  assignments: Assignment[];
  literatureTexts: LiteratureText[];
  rubric: RubricMatrix;
  rubrics: Record<string, RubricMatrix>;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  auditLogs: AuditLog[];
  aiReviews: AiReviewRequest[];
  reflections: StudentReflectionRecord[];
  classes: AcademicClass[];
  autosaveStatus: 'saved' | 'saving' | 'dirty' | 'offline' | 'conflict';
  lastSavedTime: string | null;
  isLoading: boolean;
  dataError: string | null;
  refreshAcademicData: () => Promise<void>;
  updateDraftAxis: (assignmentId: string, axisId: PoeticAxisId, analysisText: string, evidenceQuotes?: EvidenceQuote[]) => void;
  saveDraftImmediately: (assignmentId: string) => Promise<void>;
  createVersionSnapshot: (assignmentId: string, versionNumber: string, changeSummary: string, options?: CreateSnapshotOptions) => Promise<boolean>;
  addAnchoredFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'resolved'>) => Promise<{ ok: boolean; id?: string }>;
  resolveFeedback: (feedbackId: string) => Promise<void>;
  saveReflection: (assignmentId: string, versionId: string, reflection: StudentReflectionRecord['reflection']) => Promise<{ ok: boolean; id?: string }>;
  submitRubric: (evaluation: Omit<RubricAssessmentSubmission, 'id' | 'submittedAt'>) => Promise<{ ok: boolean; id?: string; totalScore?: number; maxScore?: number }>;
  createAssignment: (newAssignment: Assignment) => Promise<void>;
  getPortfolioForStudentAndAssignment: (studentId: string, assignmentId: string) => StudentPortfolio;
  resetAllData: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);
const emptyRubric: RubricMatrix = { id: '', title: 'Rubric', criteria: [] };

async function postAction(payload: unknown) {
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

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const portfolios = usePortfolioStore(state => state.portfolios);
  const autosaveStatus = usePortfolioStore(state => state.autosaveStatus);
  const lastSavedTime = usePortfolioStore(state => state.lastSavedTime);
  const hydratePortfolios = usePortfolioStore(state => state.hydratePortfolios);
  const updateDraft = usePortfolioStore(state => state.updateDraft);
  const manualSaveDraft = usePortfolioStore(state => state.manualSaveDraft);
  const createSnapshot = usePortfolioStore(state => state.createSnapshot);
  const getPortfolio = usePortfolioStore(state => state.getPortfolio);
  const resetSessionState = usePortfolioStore(state => state.resetSessionState);
  const teacherOverviewQuery = useTeacherOverviewQuery(
    currentUser.id,
    currentUser.role === 'teacher' && Boolean(currentUser.id)
  );

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [literatureTexts, setLiteratureTexts] = useState<LiteratureText[]>([]);
  const [rubric, setRubric] = useState<RubricMatrix>(emptyRubric);
  const [rubrics, setRubrics] = useState<Record<string, RubricMatrix>>({});
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [rubricSubmissions, setRubricSubmissions] = useState<RubricAssessmentSubmission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [aiReviews, setAiReviews] = useState<AiReviewRequest[]>([]);
  const [reflections, setReflections] = useState<StudentReflectionRecord[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const snapshotControllerRef = useRef<AbortController | null>(null);
  const snapshotEpochRef = useRef(0);
  const activeUserIdRef = useRef(currentUser.id);
  activeUserIdRef.current = currentUser.id;

  const applySnapshot = useCallback((snapshot: AcademicSnapshot) => {
    mockDb.hydrate(snapshot);
    hydratePortfolios(snapshot.portfolios || {});
    setAssignments(snapshot.assignments || []);
    setLiteratureTexts(snapshot.literatureTexts || []);
    const primaryRubric = snapshot.rubric || emptyRubric;
    setRubric(primaryRubric);
    setRubrics(snapshot.rubrics || (primaryRubric.id ? { [primaryRubric.id]: primaryRubric } : {}));
    setFeedbacks(snapshot.feedbacks || []);
    setRubricSubmissions(snapshot.rubricSubmissions || []);
    setAuditLogs(snapshot.auditLogs || []);
    setAiReviews(snapshot.aiReviews || []);
    setClasses(snapshot.classes || []);
    const extended = snapshot as AcademicSnapshot & { reflections?: StudentReflectionRecord[] };
    setReflections(Array.isArray(extended.reflections) ? extended.reflections : []);
  }, [hydratePortfolios]);

  const refreshAcademicData = useCallback(async () => {
    const requestedUserId = currentUser.id;
    if (!requestedUserId) return;

    if (currentUser.role === 'teacher') {
      setIsLoading(true);
      setDataError(null);
      try {
        const result = await teacherOverviewQuery.refetch();
        if (result.data && activeUserIdRef.current === requestedUserId) {
          applySnapshot(result.data as AcademicSnapshot);
        }
        if (result.error) throw result.error;
      } catch (error: unknown) {
        if (activeUserIdRef.current !== requestedUserId) return;
        setDataError(error instanceof Error ? error.message : 'Không thể tải dữ liệu giảng dạy');
      } finally {
        if (activeUserIdRef.current === requestedUserId) setIsLoading(false);
      }
      return;
    }

    snapshotControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotControllerRef.current = controller;
    const requestEpoch = ++snapshotEpochRef.current;

    setIsLoading(true);
    setDataError(null);
    try {
      const response = await fetch('/api/academic/snapshot', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok || !data?.snapshot) throw new Error(data?.message || 'Không thể tải dữ liệu học tập');
      if (controller.signal.aborted || requestEpoch !== snapshotEpochRef.current || activeUserIdRef.current !== requestedUserId) return;
      applySnapshot(data.snapshot);
    } catch (error: unknown) {
      if (controller.signal.aborted || requestEpoch !== snapshotEpochRef.current || activeUserIdRef.current !== requestedUserId) return;
      setDataError(error instanceof Error ? error.message : 'Không thể tải dữ liệu học tập');
    } finally {
      if (requestEpoch === snapshotEpochRef.current && activeUserIdRef.current === requestedUserId) setIsLoading(false);
    }
  }, [applySnapshot, currentUser.id, currentUser.role, teacherOverviewQuery]);

  useEffect(() => {
    snapshotControllerRef.current?.abort();
    snapshotControllerRef.current = null;
    snapshotEpochRef.current += 1;
    resetSessionState();
    setAssignments([]);
    setLiteratureTexts([]);
    setRubric(emptyRubric);
    setRubrics({});
    setFeedbacks([]);
    setRubricSubmissions([]);
    setAuditLogs([]);
    setAiReviews([]);
    setReflections([]);
    setClasses([]);
    setDataError(null);
    setIsLoading(false);

    // Students and teachers use scoped TanStack Query resources.
    // Compatibility snapshot remains only for peer/researcher/admin/AI workflows.
    if (currentUser.id && !['student', 'teacher'].includes(currentUser.role)) void refreshAcademicData();
    return () => snapshotControllerRef.current?.abort();
  }, [currentUser.id, currentUser.role, refreshAcademicData, resetSessionState]);

  useEffect(() => {
    if (currentUser.role !== 'teacher') return;
    setIsLoading(teacherOverviewQuery.isLoading || teacherOverviewQuery.isFetching);
    setDataError(teacherOverviewQuery.error instanceof Error ? teacherOverviewQuery.error.message : null);
    if (teacherOverviewQuery.data) applySnapshot(teacherOverviewQuery.data as AcademicSnapshot);
  }, [
    applySnapshot,
    currentUser.role,
    teacherOverviewQuery.data,
    teacherOverviewQuery.error,
    teacherOverviewQuery.isFetching,
    teacherOverviewQuery.isLoading
  ]);

  const getPortfolioForStudentAndAssignment = useCallback(
    (studentId: string, assignmentId: string) => getPortfolio(
      studentId,
      assignmentId,
      studentId === currentUser.id ? currentUser.name : 'Học sinh',
      currentUser.className || ''
    ),
    [currentUser, getPortfolio]
  );

  const updateDraftAxis = (assignmentId: string, axisId: PoeticAxisId, analysisText: string, evidenceQuotes?: EvidenceQuote[]) =>
    updateDraft(currentUser.id, assignmentId, axisId, analysisText, evidenceQuotes);

  const saveDraftImmediately = (assignmentId: string) =>
    manualSaveDraft(currentUser.id, assignmentId);

  const createVersionSnapshot = async (
    assignmentId: string,
    versionNumber: string,
    changeSummary: string,
    options?: CreateSnapshotOptions
  ) => {
    const ok = await createSnapshot(currentUser.id, assignmentId, versionNumber, changeSummary, currentUser.name, options);
    if (ok) void refreshAcademicData();
    return ok;
  };

  const addAnchoredFeedback = async (feedbackData: Omit<FeedbackItem, 'id' | 'createdAt' | 'resolved'>) => {
    const optimistic: FeedbackItem = {
      ...feedbackData,
      id: `pending-${Date.now()}`,
      createdAt: new Date().toISOString(),
      resolved: false
    };
    setFeedbacks(previous => [optimistic, ...previous]);
    try {
      const res = await postAction({ action: 'add_feedback', ...feedbackData });
      await refreshAcademicData();
      return { ok: true, id: res.id };
    } catch (error) {
      setFeedbacks(previous => previous.filter(item => item.id !== optimistic.id));
      throw error;
    }
  };

  const resolveFeedback = async (feedbackId: string) => {
    setFeedbacks(previous => previous.map(item => item.id === feedbackId ? { ...item, resolved: true } : item));
    try {
      await postAction({ action: 'resolve_feedback', feedbackId });
      await refreshAcademicData();
    } catch (error) {
      await refreshAcademicData();
      throw error;
    }
  };

  const saveReflection = async (assignmentId: string, versionId: string, reflection: StudentReflectionRecord['reflection']) => {
    const res = await postAction({ action: 'save_reflection', assignmentId, versionId, reflection });
    await refreshAcademicData();
    return { ok: true, id: res.id };
  };

  const submitRubric = async (evaluation: Omit<RubricAssessmentSubmission, 'id' | 'submittedAt'>) => {
    const res = await postAction({ action: 'submit_rubric', ...evaluation });
    await refreshAcademicData();
    return { ok: true, id: res.id, totalScore: res.totalScore, maxScore: res.maxScore };
  };

  const createAssignment = async (newAssignment: Assignment) => {
    setAssignments(previous => [newAssignment, ...previous.filter(item => item.id !== newAssignment.id)]);
    try {
      await postAction({ action: 'create_assignment', ...newAssignment });
      await refreshAcademicData();
    } catch (error) {
      await refreshAcademicData();
      throw error;
    }
  };

  const resetAllData = () => {
    void refreshAcademicData();
  };

  return <PortfolioContext.Provider value={{
    portfolios,
    assignments,
    literatureTexts,
    rubric,
    rubrics,
    feedbacks,
    rubricSubmissions,
    auditLogs,
    aiReviews,
    reflections,
    classes,
    autosaveStatus,
    lastSavedTime: lastSavedTime || null,
    isLoading,
    dataError,
    refreshAcademicData,
    updateDraftAxis,
    saveDraftImmediately,
    createVersionSnapshot,
    addAnchoredFeedback,
    resolveFeedback,
    saveReflection,
    submitRubric,
    createAssignment,
    getPortfolioForStudentAndAssignment,
    resetAllData
  }}>{children}</PortfolioContext.Provider>;
};

// Context hooks are intentionally co-located with their provider for API compatibility.
// eslint-disable-next-line react/only-export-components
export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within an PortfolioProvider');
  return context;
};
