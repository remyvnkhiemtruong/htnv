import type {
  User,
  Assignment,
  LiteratureText,
  RubricMatrix,
  StudentPortfolio,
  FeedbackItem,
  RubricAssessmentSubmission,
  AuditLog
} from '../../types';

type SnapshotShape = {
  users?: User[];
  assignments?: Assignment[];
  literatureTexts?: LiteratureText[];
  rubric?: RubricMatrix;
  portfolios?: Record<string, StudentPortfolio>;
  feedbacks?: FeedbackItem[];
  rubricSubmissions?: RubricAssessmentSubmission[];
  auditLogs?: AuditLog[];
};

class AcademicMemoryCache {
  private users: User[] = [];
  private assignments: Assignment[] = [];
  private texts: LiteratureText[] = [];
  private rubric: RubricMatrix = { id: 'rubric-poetics-std', title: 'Bảng tiêu chí chấm điểm', criteria: [] };
  private portfolios: Record<string, StudentPortfolio> = {};
  private feedbacks: FeedbackItem[] = [];
  private rubricSubs: RubricAssessmentSubmission[] = [];
  private auditLogs: AuditLog[] = [];

  hydrate(snapshot: SnapshotShape) {
    if (snapshot.users) this.users = snapshot.users;
    if (snapshot.assignments) this.assignments = snapshot.assignments;
    if (snapshot.literatureTexts) this.texts = snapshot.literatureTexts;
    if (snapshot.rubric) this.rubric = snapshot.rubric;
    if (snapshot.portfolios) this.portfolios = snapshot.portfolios;
    if (snapshot.feedbacks) this.feedbacks = snapshot.feedbacks;
    if (snapshot.rubricSubmissions) this.rubricSubs = snapshot.rubricSubmissions;
    if (snapshot.auditLogs) this.auditLogs = snapshot.auditLogs;
  }

  getUsers(): User[] { return this.users; }
  getAssignments(): Assignment[] { return this.assignments; }
  getLiteratureTexts(): LiteratureText[] { return this.texts; }
  getRubric(): RubricMatrix { return this.rubric; }
  getPortfolios(): Record<string, StudentPortfolio> { return this.portfolios; }
  getFeedbacks(): FeedbackItem[] { return this.feedbacks; }
  getRubricSubmissions(): RubricAssessmentSubmission[] { return this.rubricSubs; }
  getAuditLogs(): AuditLog[] { return this.auditLogs; }

  saveAssignment(assignment: Assignment): void {
    this.assignments = [assignment, ...this.assignments.filter(item => item.id !== assignment.id)];
  }

  savePortfolio(portfolio: StudentPortfolio): void {
    this.portfolios = { ...this.portfolios, [portfolio.id]: portfolio };
  }

  saveFeedback(item: FeedbackItem): void {
    this.feedbacks = [item, ...this.feedbacks.filter(feedback => feedback.id !== item.id)];
  }

  updateFeedback(item: FeedbackItem): void {
    this.feedbacks = this.feedbacks.map(feedback => feedback.id === item.id ? item : feedback);
  }

  saveRubricSubmission(sub: RubricAssessmentSubmission): void {
    this.rubricSubs = [sub, ...this.rubricSubs.filter(item => item.id !== sub.id)];
  }

  saveAuditLog(log: AuditLog): void {
    this.auditLogs = [log, ...this.auditLogs.filter(item => item.id !== log.id)];
  }

  reset(): void {
    this.users = [];
    this.assignments = [];
    this.texts = [];
    this.rubric = { id: 'rubric-poetics-std', title: 'Bảng tiêu chí chấm điểm', criteria: [] };
    this.portfolios = {};
    this.feedbacks = [];
    this.rubricSubs = [];
    this.auditLogs = [];
  }
}

// Compatibility adapter for existing views. It is hydrated from PostgreSQL
// and never persists application data to localStorage.
export const mockDb = new AcademicMemoryCache();
