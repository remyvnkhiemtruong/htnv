export type UserRole = 'student' | 'teacher' | 'peer' | 'admin' | 'researcher' | 'ai';

export interface UserProfile {
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
  favoriteGenres?: string[];
  favoriteAuthors?: string[];
  favoriteWorks?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  className?: string;
  assignedPeerRevieweeId?: string;
  mustChangePassword?: boolean;
  accountStatus?: 'active' | 'locked';
  lastLogin?: string | null;
  profile?: UserProfile;
}

export type PoeticAxisId =
  | 'plot_situation'
  | 'character_detail'
  | 'narrator_pov'
  | 'space_time'
  | 'language_tone_symbol'
  | 'form_argument';

export interface PoeticAxis {
  id: PoeticAxisId;
  order: number;
  title: string;
  shortName: string;
  description: string;
  guidingQuestions: string[];
  focusKeywords: string[];
  iconName: string;
}

export interface LiteratureText {
  /** Exact immutable revision id used by assignments. */
  id: string;
  /** Stable logical identity across revisions. */
  logicalId?: string;
  revisionNo?: number;
  isLatest?: boolean;
  contentChecksum?: string;
  title: string;
  author: string;
  year: string;
  genre: string;
  synopsis: string;
  excerpt: string;
  fullContent: string;
  historicalContext: string;
  tags: string[];
}

export interface EvidenceQuote {
  id: string;
  text: string;
  contextNote?: string;
  pageOrParagraph?: string;
}

export interface PoeticAxisResponse {
  axisId: PoeticAxisId;
  analysisText: string;
  evidenceQuotes: EvidenceQuote[];
  studentNotes?: string;
  conceptTags?: string[];
}

export type PortfolioVersionStage = 'prediction' | 'initial' | 'revision';
export type ChangeSource = 'initial_prediction' | 'initial_response' | 'self' | 'teacher_feedback' | 'peer_feedback' | 'mixed' | string;

export interface PortfolioVersion {
  id: string;
  versionNumber: string;
  sequenceNo?: number;
  stage?: PortfolioVersionStage;
  confidence?: number | null;
  changeSource?: ChangeSource | null;
  revisionReason?: string | null;
  previousVersionId?: string | null;
  contentChecksum?: string | null;
  submissionKey?: string | null;
  createdAt: string;
  createdBy: string;
  authorName: string;
  changeSummary: string;
  responses: Record<PoeticAxisId, PoeticAxisResponse>;
  isFrozen: boolean;
  isSubmitted: boolean;
}

export interface FeedbackItem {
  id: string;
  assignmentId: string;
  studentId: string;
  versionId?: string;
  versionNumber: string;
  axisId: PoeticAxisId;
  selectedSnippet: string;
  comment: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'peer' | 'ai';
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string | null;
  resolvedByVersionId?: string | null;
  sourceAiReviewId?: string | null;
}

export interface RubricLevel {
  level: 1 | 2 | 3 | 4;
  label: 'Chưa đạt' | 'Đạt' | 'Khá' | 'Xuất sắc';
  score: number;
  description: string;
  observableIndicators: string[];
}

export interface RubricCriterion {
  id: string;
  axisId: PoeticAxisId;
  title: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricMatrix {
  id: string;
  title: string;
  description?: string;
  criteria: RubricCriterion[];
}

export interface RubricAssessmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  versionId?: string;
  versionNumber: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: 'student' | 'peer' | 'teacher';
  criterionScores: Record<string, { level: number; score: number; note: string }>;
  overallFeedback: string;
  totalScore: number;
  maxScore: number;
  submittedAt: string;
}

export interface PredictionTemplate {
  enabled?: boolean;
  prompt?: string;
  questions?: string[];
  requireConfidence?: boolean;
  /** Public study notes, shown only after the V0 prediction is submitted. */
  readingGuide?: string;
  readingSources?: Array<{ label: string; url: string }>;
}

export interface WorkflowConfig {
  predictionEnabled?: boolean;
  aiReviewRequired?: boolean;
  teacherApprovalRequired?: boolean;
  peerReviewEnabled?: boolean;
  officialRubricRequired?: boolean;
  [key: string]: unknown;
}

export interface Assignment {
  id: string;
  title: string;
  /** Exact immutable literature revision id. */
  textId: string;
  classId: string;
  assignedDate: string;
  deadline: string;
  difficulty: 'Cơ bản' | 'Nâng cao' | 'Chuyên sâu';
  targetAxes: PoeticAxisId[];
  prompt: string;
  guidingSteps: string[];
  rubricId: string;
  starterTemplate?: Partial<Record<PoeticAxisId, string>>;
  aiGuidance?: string;
  commonMistakes?: string;
  referenceGuide?: string;
  predictionTemplate?: PredictionTemplate;
  workflowConfig?: WorkflowConfig;
}

export type PortfolioStatus =
  | 'drafting'
  | 'submitted_waiting_ai'
  | 'ai_proposed_waiting_teacher'
  | 'teacher_feedback_needed'
  | 'feedback_received'
  | 'revising'
  | 'waiting_official_rubric'
  | 'completed'
  | 'v1_submitted'
  | 'v2_in_revision';

export interface StudentPortfolio {
  id: string;
  dbId?: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  className: string;
  currentDraft: Record<PoeticAxisId, PoeticAxisResponse>;
  lastAutosavedAt: string;
  draftRevision?: number;
  versions: PortfolioVersion[];
  currentActiveVersion: string;
  status: PortfolioStatus;
}

export interface AiReviewRequest {
  id: string;
  assignment_id: string;
  student_id: string;
  student_name: string;
  version_number: string;
  version_id?: string;
  portfolio_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  prompt: string;
  response: string;
  final_response?: string;
  stage?: string;
  teacher_review_status: 'pending' | 'approved' | 'revised' | 'rejected';
  teacher_note: string;
  teacher_id?: string | null;
  teacher_reviewed_at?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface AcademicClass {
  id: string;
  code: string;
  name: string;
  school_year: string;
  student_count?: number;
}

export interface AcademicSnapshot {
  assignments: Assignment[];
  literatureTexts: LiteratureText[];
  rubric: RubricMatrix;
  rubrics?: Record<string, RubricMatrix>;
  portfolios: Record<string, StudentPortfolio>;
  feedbacks: FeedbackItem[];
  rubricSubmissions: RubricAssessmentSubmission[];
  auditLogs: AuditLog[];
  classes?: AcademicClass[];
  users?: User[];
  aiReviews?: AiReviewRequest[];
}

export interface TaskRecommendation {
  nextAssignmentId: string;
  assignmentTitle: string;
  targetAxisId: PoeticAxisId;
  targetAxisTitle: string;
  rationale: string;
  expectedGain: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  ipAddress: string;
}
