import { create } from 'zustand';
import type { StudentPortfolio, PoeticAxisId, PortfolioVersion, EvidenceQuote } from '../../types';
import { mockDb } from '../../services/mockApi/mockDb';
import { POETIC_AXES } from '../../data/seedData';

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
  autosaveStatus: 'saved' | 'saving' | 'dirty';
  lastSavedTime: string;
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
    if (!response.ok) throw new Error(data.message || data.code || 'Không thể lưu dữ liệu');
    return data;
  } finally {
    activeControllers.delete(controller);
  }
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
    set({ portfolios: {}, autosaveStatus: 'saved', lastSavedTime: '' });
  },

  hydratePortfolios: (serverPortfolios) => {
    const local = get().portfolios;
    const merged: Record<string, StudentPortfolio> = {};
    for (const [key, serverPortfolio] of Object.entries(serverPortfolios)) {
      const localPortfolio = local[key];
      merged[key] = dirtyPortfolioKeys.has(key) && localPortfolio
        ? { ...serverPortfolio, currentDraft: localPortfolio.currentDraft, lastAutosavedAt: localPortfolio.lastAutosavedAt }
        : serverPortfolio;
      mockDb.savePortfolio(merged[key]);
    }
    set({ portfolios: merged, autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved' });
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
    set(state => ({ portfolios: { ...state.portfolios, [key]: updated }, autosaveStatus: 'dirty' }));

    const existing = saveTimers.get(key);
    if (existing) clearTimeout(existing);
    const epoch = sessionEpoch;
    saveTimers.set(key, setTimeout(() => {
      saveTimers.delete(key);
      void enqueueSave(key, async () => {
        if (epoch !== sessionEpoch) return;
        set({ autosaveStatus: 'saving' });
        try {
          const latestDraft = get().portfolios[key]?.currentDraft || updated.currentDraft;
          await postAction({ action: 'save_draft', assignmentId, content: latestDraft });
          if (epoch !== sessionEpoch) return;
          dirtyPortfolioKeys.delete(key);
          set({ autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved', lastSavedTime: new Date().toLocaleTimeString('vi-VN') });
        } catch {
          if (epoch !== sessionEpoch) return;
          dirtyPortfolioKeys.add(key);
          set({ autosaveStatus: 'dirty' });
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
        await postAction({ action: 'save_draft', assignmentId, content: port.currentDraft });
        if (epoch !== sessionEpoch) return;
        dirtyPortfolioKeys.delete(key);
        set({ autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved', lastSavedTime: new Date().toLocaleTimeString('vi-VN') });
      } catch (error) {
        if (epoch !== sessionEpoch) return;
        dirtyPortfolioKeys.add(key);
        set({ autosaveStatus: 'dirty' });
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
      const submissionKey = pendingSubmissionKeys.get(key) || options.submissionKey || newSubmissionKey();
      pendingSubmissionKeys.set(key, submissionKey);
      try {
        const pendingSave = saveTimers.get(key);
        if (pendingSave) {
          clearTimeout(pendingSave);
          saveTimers.delete(key);
        }

        await enqueueSave(key, async () => {
          if (epoch !== sessionEpoch) throw new Error('SESSION_CHANGED');
          const latest = get().getPortfolio(studentId, assignmentId);
          set({ autosaveStatus: 'saving' });
          await postAction({ action: 'save_draft', assignmentId, content: latest.currentDraft });
        });

        if (epoch !== sessionEpoch) throw new Error('SESSION_CHANGED');
        const port = get().getPortfolio(studentId, assignmentId);
        dirtyPortfolioKeys.delete(key);

        const result = await postAction({
          action: 'create_version',
          assignmentId,
          versionNumber,
          changeSummary,
          content: port.currentDraft,
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
          responses: JSON.parse(JSON.stringify(port.currentDraft)),
          isFrozen: true,
          isSubmitted: true
        };
        const previousVersions = port.versions.some(version => version.id === newVer.id)
          ? port.versions
          : [...port.versions, newVer];
        const updated: StudentPortfolio = {
          ...port,
          currentActiveVersion: newVer.versionNumber,
          status: result.portfolioStatus || 'submitted_waiting_ai',
          versions: previousVersions
        };
        pendingSubmissionKeys.delete(key);
        mockDb.savePortfolio(updated);
        set(state => ({
          portfolios: { ...state.portfolios, [key]: updated },
          autosaveStatus: dirtyPortfolioKeys.size ? 'dirty' : 'saved',
          lastSavedTime: new Date().toLocaleTimeString('vi-VN')
        }));
        return true;
      } catch {
        if (epoch === sessionEpoch) {
          dirtyPortfolioKeys.add(key);
          set({ autosaveStatus: 'dirty' });
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
