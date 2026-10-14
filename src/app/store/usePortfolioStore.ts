import { learningErrorText, learningText } from '../../utils/learningLabels';
import { create } from 'zustand';
import type { StudentPortfolio, PoeticAxisId, PortfolioVersion, EvidenceQuote } from '../../types';
import { mockDb } from '../../services/mockApi/mockDb';
import { POETIC_AXES } from '../../data/seedData';
import { clearDraftRecovery, saveDraftRecovery } from '../offline/draftRecovery';

export interface CreateSnapshotOptions {
  submissionKey?: string;
  stage?: 'prediction' | 'initial' | 'revision';
  confidence?: number | null;
  changeSource?: string;
  revisionReason?: string;
  linkedFeedbackIds?: string[];
}

interface PortfolioState {
  portfolios: Record<string, StudentPortfolio>;
  autosaveStatus: 'saved' | 'saving' | 'dirty' | 'offline' | 'conflict';
  lastSavedTime: string;
  lastSaveError: string;
  hydratePortfolios: (portfolios: Record<string, StudentPortfolio>) => void;
  loadPortfolios: () => void;
  getPortfolio: (studentId: string, assignmentId: string, studentName?: string, className?: string) => StudentPortfolio;
  updateDraft: (studentId: string, assignmentId: string, axisId: PoeticAxisId, text: string, quotes?: EvidenceQuote[]) => void;
  manualSaveDraft: (studentId: string, assignmentId: string) => Promise<void>;
  createSnapshot: (studentId: string, assignmentId: string, versionNumber: string, changeSummary: string, authorName: string, options?: CreateSnapshotOptions) => Promise<boolean>;
  resetSessionState: () => void;
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyPortfolioKeys = new Set<string>();
const pendingSubmissionKeys = new Map<string, string>();
const inFlightSubmissions = new Map<string, Promise<boolean>>();
const saveChains = new Map<string, Promise<void>>();
const activeControllers = new Set<AbortController>();
let sessionEpoch = 0;

const newSubmissionKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  throw new Error('SECURE_RANDOM_UNAVAILABLE');
};

const postAction = async (payload: unknown) => {
  const controller = new AbortController();
  activeControllers.add(controller);
  try {
    const response = await fetch('/api/academic/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(learningText(response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Em hãy đăng nhập lại; bản nháp vẫn được giữ trên máy này.' : data.message || 'Không thể lưu dữ liệu')) as Error & { code?: string };
      error.code = data.code;
      throw error;
    }
    return data;
  } finally {
    activeControllers.delete(controller);
  }
};

const saveFailureStatus = (error: unknown): Pick<PortfolioState, 'autosaveStatus' | 'lastSaveError'> => {
  const typed = error as Error & { code?: string };
  if (typed?.code === 'DRAFT_CONFLICT') {
    return { autosaveStatus: 'conflict', lastSaveError: typed.message || 'Bản nháp đã thay đổi ở phiên khác.' };
  }
  return {
    autosaveStatus: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'dirty',
    lastSaveError: learningErrorText(error, 'Chưa thể đồng bộ bản nháp.')
  };
};

const persistRecovery = (userId: string, assignmentId: string, portfolio: StudentPortfolio) => {
  void saveDraftRecovery({
    userId,
    assignmentId,
    draft: portfolio.currentDraft,
    draftRevision: Number(portfolio.draftRevision || 0)
  });
};

const enqueueSave = async (key: string, task: () => Promise<void>) => {
  const previous = saveChains.get(key) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  saveChains.set(key, current);
  try {
    await current;
  } finally {
    if (saveChains.get(key) === current) saveChains.delete(key);
  }
};

const applySavedRevision = (
  key: string,
  result: { draftRevision?: number; savedAt?: string },
  set: (partial: Partial<PortfolioState> | ((state: PortfolioState) => Partial<PortfolioState>)) => void,
  get: () => PortfolioState
) => {
  const current = get().portfolios[key];
  if (!current) return;
  const next: StudentPortfolio = {
    ...current,
    draftRevision: Number(result.draftRevision ?? current.draftRevision ?? 0),
    lastAutosavedAt: result.savedAt || current.lastAutosavedAt
  };
  mockDb.savePortfolio(next);
  set(state => ({ portfolios: { ...state.portfolios, [key]: next } }));
};

const blankPortfolio = (studentId: string, assignmentId: string, studentName: string, className: string): StudentPortfolio => {
  const initialDraft: Record<PoeticAxisId, any> = {} as any;
  POETIC_AXES.forEach(axis => { initialDraft[axis.id] = { axisId: axis.id, analysisText: '', evidenceQuotes: [] }; });
  return {
    id: `port-${studentId}-${assignmentId}`,
    assignmentId,
    studentId,
    studentName,
    className,
    lastAutosavedAt: new Date().toISOString(),
    draftRevision: 0,
    currentActiveVersion: 'Bản nháp',
    status: 'drafting',
    currentDraft: initialDraft,
    versions: []
  };
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: {},
  autosaveStatus: 'saved',
  lastSavedTime: '',
  lastSaveError: '',

  resetSessionState: () => {
    sessionEpoch += 1;
    for (const timer of saveTimers.values()) clearTimeout(timer);
    saveTimers.clear();
    dirtyPortfolioKeys.clear();
    pendingSubmissionKeys.clear();
    inFlightSubmissions.clear();
    saveChains.clear();
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
    mockDb.reset();
    set({ portfolios: {}, autosaveStatus: 'saved', lastSavedTime: '', lastSaveError: '' });
  },

  hydratePortfolios: (serverPortfolios) => {
    const local = get().portfolios;
    const merged: Record<string, StudentPortfolio> = Object.fromEntries(
      Object.entries(local).filter(([key]) => dirtyPortfolioKeys.has(key))
    );
    for (const [key, serverPortfolio] of Object.entries(serverPortfolios)) {
      const localPortfolio = local[key];
      merged[key] = dirtyPortfolioKeys.has(key) && localPortfolio
        ? {
            ...serverPortfolio,
            currentDraft: localPortfolio.currentDraft,
            lastAutosavedAt: localPortfolio.lastAutosavedAt,
            draftRevision: localPortfolio.draftRevision
          }
        : serverPortfolio;
      mockDb.savePortfolio(merged[key]);
    }
    set(state => ({ portfolios: merged, autosaveStatus: dirtyPortfolioKeys.size ? state.autosaveStatus : 'saved' }));
  },

  loadPortfolios: () => set({ portfolios: mockDb.getPortfolios() }),

  getPortfolio: (studentId, assignmentId, studentName = 'Học sinh', className = '') => {
    const key = `port-${studentId}-${assignmentId}`;
    return get().portfolios[key] || blankPortfolio(studentId, assignmentId, studentName, className);
  },

  updateDraft: (studentId, assignmentId, axisId, text, quotes) => {
    const key = `port-${studentId}-${assignmentId}`;
    const port = get().getPortfolio(studentId, assignmentId);
    const updated: StudentPortfolio = {
      ...port,
      lastAutosavedAt: new Date().toISOString(),
      currentDraft: {
        ...port.currentDraft,
        [axisId]: {
          axisId,
          analysisText: text,
          evidenceQuotes: quotes || port.currentDraft[axisId]?.evidenceQuotes || []
        }
      }
    };
    dirtyPortfolioKeys.add(key);
    pendingSubmissionKeys.delete(key);
    mockDb.savePortfolio(updated);
    persistRecovery(studentId, assignmentId, updated);
    set(state => ({ portfolios: { ...state.portfolios, [key]: updated }, autosaveStatus: 'dirty', lastSaveError: '' }));

    const existing = saveTimers.get(key);
    if (existing) clearTimeout(existing);
    const epoch = sessionEpoch;
    saveTimers.set(key, setTimeout(() => {
      saveTimers.delete(key);
      void enqueueSave(key, async () => {
        if (epoch !== sessionEpoch) return;
        set({ autosaveStatus: 'saving' });
        try {
          const latestPortfolio = get().portfolios[key] || updated;
          const result = await postAction({
            action: 'save_draft',
            assignmentId,
            content: latestPortfolio.currentDraft,
            draftRevision: latestPortfolio.draftRevision ?? 0
          });
          if (epoch !== sessionEpoch) return;
          applySavedRevision(key, result, set, get);
          if (get().portfolios[key]?.currentDraft === latestPortfolio.currentDraft) {
            dirtyPortfolioKeys.delete(key);
            void clearDraftRecovery(studentId, assignmentId);
          }
          set({ autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved', lastSavedTime: new Date().toLocaleTimeString('vi-VN'), lastSaveError: '' });
        } catch (error) {
          if (epoch !== sessionEpoch) return;
          dirtyPortfolioKeys.add(key);
          const latestPortfolio = get().portfolios[key] || updated;
          persistRecovery(studentId, assignmentId, latestPortfolio);
          set(saveFailureStatus(error));
        }
      });
    }, 800));
  },

  manualSaveDraft: async (studentId, assignmentId) => {
    const key = `port-${studentId}-${assignmentId}`;
    const pending = saveTimers.get(key);
    if (pending) {
      clearTimeout(pending);
      saveTimers.delete(key);
    }
    const epoch = sessionEpoch;
    await enqueueSave(key, async () => {
      if (epoch !== sessionEpoch) return;
      const port = get().getPortfolio(studentId, assignmentId);
      set({ autosaveStatus: 'saving' });
      try {
        const result = await postAction({
          action: 'save_draft',
          assignmentId,
          content: port.currentDraft,
          draftRevision: port.draftRevision ?? 0
        });
        if (epoch !== sessionEpoch) return;
        applySavedRevision(key, result, set, get);
        if (get().portfolios[key]?.currentDraft === port.currentDraft) {
          dirtyPortfolioKeys.delete(key);
          void clearDraftRecovery(studentId, assignmentId);
        }
        set({ autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved', lastSavedTime: new Date().toLocaleTimeString('vi-VN'), lastSaveError: '' });
      } catch (error) {
        if (epoch !== sessionEpoch) return;
        dirtyPortfolioKeys.add(key);
        const latestPortfolio = get().getPortfolio(studentId, assignmentId);
        persistRecovery(studentId, assignmentId, latestPortfolio);
        set(saveFailureStatus(error));
        throw error;
      }
    });
  },

  createSnapshot: async (studentId, assignmentId, versionNumber, changeSummary, authorName, options = {}) => {
    const key = `port-${studentId}-${assignmentId}`;
    const existingFlight = inFlightSubmissions.get(key);
    if (existingFlight) return existingFlight;
    const epoch = sessionEpoch;

    const operation = (async () => {
      const isRetry = pendingSubmissionKeys.has(key);
      const submissionKey = pendingSubmissionKeys.get(key) || options.submissionKey || newSubmissionKey();
      pendingSubmissionKeys.set(key, submissionKey);
      let draftSaved = false;
      try {
        const pendingSave = saveTimers.get(key);
        if (pendingSave) {
          clearTimeout(pendingSave);
          saveTimers.delete(key);
        }

        if (!isRetry) await enqueueSave(key, async () => {
          if (epoch !== sessionEpoch) throw new Error('SESSION_CHANGED');
          const latest = get().getPortfolio(studentId, assignmentId);
          set({ autosaveStatus: 'saving' });
          const result = await postAction({
            action: 'save_draft',
            assignmentId,
            content: latest.currentDraft,
            draftRevision: latest.draftRevision ?? 0
          });
          applySavedRevision(key, result, set, get);
          draftSaved = true;
          if (get().portfolios[key]?.currentDraft === latest.currentDraft) {
            dirtyPortfolioKeys.delete(key);
            void clearDraftRecovery(studentId, assignmentId);
          }
        });

        if (epoch !== sessionEpoch) throw new Error('SESSION_CHANGED');
        const port = get().getPortfolio(studentId, assignmentId);

        const result = await postAction({
          action: 'create_version',
          assignmentId,
          versionNumber,
          changeSummary,
          content: port.currentDraft,
          draftRevision: port.draftRevision ?? 0,
          submissionKey,
          stage: options.stage,
          confidence: options.confidence,
          changeSource: options.changeSource,
          revisionReason: options.revisionReason,
          linkedFeedbackIds: options.linkedFeedbackIds
        });
        if (epoch !== sessionEpoch) throw new Error('SESSION_CHANGED');

        const serverVer = result.version;
        if (!serverVer?.id || !serverVer?.versionNumber) throw new Error('INVALID_VERSION_RESPONSE');
        const newVer: PortfolioVersion = {
          id: serverVer.id,
          versionNumber: serverVer.versionNumber,
          sequenceNo: serverVer.sequenceNo,
          stage: serverVer.stage || options.stage || 'initial',
          confidence: options.confidence,
          changeSource: options.changeSource,
          revisionReason: options.revisionReason,
          contentChecksum: serverVer.contentChecksum || null,
          createdAt: serverVer.createdAt || new Date().toISOString(),
          createdBy: studentId,
          authorName,
          changeSummary: changeSummary.trim(),
          responses: JSON.parse(JSON.stringify(serverVer.responses || port.currentDraft)),
          isFrozen: true,
          isSubmitted: true
        };
        const previousVersions = port.versions.some(version => version.id === newVer.id)
          ? port.versions
          : [...port.versions, newVer];
        const updated: StudentPortfolio = {
          ...port,
          currentDraft: get().portfolios[key]?.currentDraft || port.currentDraft,
          currentActiveVersion: newVer.versionNumber,
          draftRevision: result.draftRevision ?? port.draftRevision,
          status: result.portfolioStatus || 'submitted_waiting_ai',
          versions: previousVersions
        };
        pendingSubmissionKeys.delete(key);
        if (updated.currentDraft === port.currentDraft) {
          dirtyPortfolioKeys.delete(key);
          void clearDraftRecovery(studentId, assignmentId);
        } else {
          dirtyPortfolioKeys.add(key);
          persistRecovery(studentId, assignmentId, updated);
        }
        mockDb.savePortfolio(updated);
        set(state => ({
          portfolios: { ...state.portfolios, [key]: updated },
          autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved',
          lastSavedTime: new Date().toLocaleTimeString('vi-VN'),
          lastSaveError: ''
        }));
        return true;
      } catch (error) {
        if (epoch === sessionEpoch) {
          const latestPortfolio = get().getPortfolio(studentId, assignmentId);
          if (draftSaved) {
            set({ autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved', lastSaveError: learningErrorText(error) });
          } else {
            dirtyPortfolioKeys.add(key);
            persistRecovery(studentId, assignmentId, latestPortfolio);
            set(saveFailureStatus(error));
          }
        }
        return false;
      } finally {
        inFlightSubmissions.delete(key);
      }
    })();

    inFlightSubmissions.set(key, operation);
    return operation;
  }
}));
