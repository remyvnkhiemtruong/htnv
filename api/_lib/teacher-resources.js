import { getPool } from './db.js';
import { emptyDraft } from './academic-core.js';
import { normalizePoeticContent } from './content-compat.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value, max = 200) => String(value ?? '').trim().slice(0, max);

function assertTeacher(user) {
  if (!user || user.role !== 'teacher') throw new Error('FORBIDDEN');
}

const mapAssignment = row => ({
  id: row.public_id,
  title: row.title,
  textId: row.literature_text_version_id || '',
  classId: row.class_code,
  assignedDate: row.assigned_at,
  deadline: row.deadline || '',
  difficulty: row.difficulty,
  targetAxes: row.target_axes || [],
  prompt: row.prompt || '',
  guidingSteps: row.guiding_steps || [],
  rubricId: row.rubric_public_id,
  starterTemplate: row.starter_template || {},
  aiGuidance: row.ai_guidance || '',
  commonMistakes: row.common_mistakes || '',
  referenceGuide: row.reference_guide || '',
  predictionTemplate: row.prediction_template || {},
  workflowConfig: row.workflow_config || {}
});

const mapVersion = (row, includeContent = false) => ({
  id: row.id,
  versionNumber: row.version_number,
  sequenceNo: Number(row.sequence_no || 0),
  stage: row.stage,
  confidence: row.confidence === null ? null : Number(row.confidence),
  changeSource: row.change_source,
  revisionReason: row.revision_reason,
  previousVersionId: row.previous_version_id,
  contentChecksum: row.content_checksum,
  submissionKey: null,
  createdAt: row.submitted_at,
  createdBy: row.created_by || '',
  authorName: row.author_name || '',
  changeSummary: row.change_summary || '',
  responses: includeContent ? normalizePoeticContent(row.content_json || {}) : {},
  isFrozen: true,
  isSubmitted: true
});

const mapPortfolio = (row, versions) => ({
  id: `port-${row.student_id}-${row.assignment_public_id}`,
  dbId: row.id,
  assignmentId: row.assignment_public_id,
  studentId: row.student_id,
  studentName: row.student_name,
  className: row.class_code,
  currentDraft: emptyDraft(),
  lastAutosavedAt: row.updated_at,
  draftRevision: 0,
  versions,
  currentActiveVersion: versions.length ? row.active_version : 'Bản nháp',
  status: row.status
});

const mapRubricSubmission = row => ({
  id: row.id,
  assignmentId: row.assignment_public_id,
  studentId: row.student_id,
  versionId: row.version_id,
  versionNumber: row.version_number,
  evaluatorId: row.evaluator_id || '',
  evaluatorName: row.evaluator_name || (row.evaluator_role === 'teacher' ? 'Giáo viên' : row.evaluator_role === 'peer' ? 'Đồng đẳng' : 'Tự đánh giá'),
  evaluatorRole: row.evaluator_role,
  criterionScores: row.criterion_scores || {},
  overallFeedback: row.overall_feedback || '',
  totalScore: Number(row.total_score || 0),
  maxScore: Number(row.max_score || 0),
  submittedAt: row.submitted_at
});

const mapFeedback = row => ({
  id: row.id,
  assignmentId: row.assignment_public_id,
  studentId: row.student_id,
  versionId: row.version_id,
  versionNumber: row.version_number,
  axisId: row.axis_id,
  selectedSnippet: row.selected_snippet || '',
  comment: row.comment || '',
  authorId: row.author_id || '',
  authorName: row.author_name || '',
  authorRole: row.author_role,
  createdAt: row.created_at,
  resolved: Boolean(row.resolved),
  resolvedAt: row.resolved_at || null,
  resolvedByVersionId: row.resolved_by_version_id || null,
  sourceAiReviewId: row.source_ai_review_id || null,
  anchor: row.anchor_json || null
});

const mapAiReview = (row, includeBodies = false) => ({
  id: row.id,
  assignment_id: row.assignment_public_id,
  student_id: row.student_id,
  student_name: row.student_name,
  version_number: row.version_number,
  version_id: row.version_id,
  portfolio_id: row.portfolio_id,
  status: row.status,
  prompt: includeBodies ? (row.prompt || '') : '',
  response: includeBodies ? (row.response || '') : '',
  final_response: includeBodies ? (row.final_response || '') : '',
  stage: row.stage,
  teacher_review_status: row.teacher_review_status,
  teacher_note: includeBodies ? (row.teacher_note || '') : '',
  teacher_id: row.teacher_id || null,
  teacher_reviewed_at: row.teacher_reviewed_at || null,
  created_at: row.created_at,
  completed_at: row.completed_at || null
});

async function loadRubrics(pool) {
  const result = await pool.query(`
    SELECT r.id rubric_db_id,r.public_id rubric_public_id,r.title rubric_title,r.description rubric_description,
           rc.public_id criterion_public_id,rc.axis_id,rc.title criterion_title,rc.weight,rc.levels_json,rc.sort_order
    FROM rubrics r
    LEFT JOIN rubric_criteria rc ON rc.rubric_id=r.id
    WHERE r.is_active=true
    ORDER BY r.created_at DESC,rc.sort_order,rc.public_id
  `);
  const rubrics = {};
  for (const row of result.rows) {
    if (!rubrics[row.rubric_public_id]) {
      rubrics[row.rubric_public_id] = {
        id: row.rubric_public_id,
        title: row.rubric_title,
        description: row.rubric_description || '',
        criteria: []
      };
    }
    if (row.criterion_public_id) {
      rubrics[row.rubric_public_id].criteria.push({
        id: row.criterion_public_id,
        axisId: row.axis_id,
        title: row.criterion_title,
        weight: Number(row.weight || 1),
        levels: Array.isArray(row.levels_json) ? row.levels_json : []
      });
    }
  }
  return rubrics;
}

async function loadLatestLiteratureSummaries(pool) {
  const result = await pool.query(`
    SELECT DISTINCT ON (v.literature_text_id)
      v.id,lt.public_id logical_public_id,v.version_no,v.content_checksum,
      v.title,v.author,v.year_text,v.genre,v.synopsis,v.historical_context,v.tags
    FROM literature_text_versions v
    JOIN literature_texts lt ON lt.id=v.literature_text_id
    ORDER BY v.literature_text_id,v.version_no DESC
  `);
  return result.rows.map(row => ({
    id: row.id,
    logicalId: row.logical_public_id,
    revisionNo: Number(row.version_no || 1),
    isLatest: true,
    contentChecksum: row.content_checksum,
    title: row.title,
    author: row.author,
    year: row.year_text || '',
    genre: row.genre || '',
    synopsis: row.synopsis || '',
    excerpt: '',
    fullContent: '',
    historicalContext: row.historical_context || '',
    tags: row.tags || []
  }));
}

export async function getTeacherOverview(user) {
  assertTeacher(user);
  const pool = await getPool();

  const [classesResult, assignmentsResult, rubrics, literatureTexts, portfoliosResult] = await Promise.all([
    pool.query(`
      SELECT c.id,c.code,c.name,c.school_year,
             count(cm.user_id) FILTER(WHERE cm.member_role='student')::int student_count
      FROM classes c
      JOIN class_members mine ON mine.class_id=c.id AND mine.user_id=$1 AND mine.member_role='teacher'
      LEFT JOIN class_members cm ON cm.class_id=c.id
      GROUP BY c.id,c.code,c.name,c.school_year
      ORDER BY c.code
    `, [user.id]),
    pool.query(`
      SELECT a.*,c.code class_code,r.public_id rubric_public_id
      FROM assignments a
      JOIN class_members mine ON mine.class_id=a.class_id AND mine.user_id=$1 AND mine.member_role='teacher'
      JOIN classes c ON c.id=a.class_id
      JOIN rubrics r ON r.id=a.rubric_id
      ORDER BY a.assigned_at DESC
    `, [user.id]),
    loadRubrics(pool),
    loadLatestLiteratureSummaries(pool),
    pool.query(`
      SELECT p.id,p.student_id,p.status,p.active_version,p.updated_at,
             a.public_id assignment_public_id,u.name student_name,c.code class_code
      FROM portfolios p
      JOIN assignments a ON a.id=p.assignment_id
      JOIN class_members mine ON mine.class_id=a.class_id AND mine.user_id=$1 AND mine.member_role='teacher'
      JOIN app_users u ON u.id=p.student_id
      JOIN classes c ON c.id=a.class_id
      ORDER BY p.updated_at DESC
    `, [user.id])
  ]);

  const portfolioIds = portfoliosResult.rows.map(row => row.id);
  const [versionsResult, rubricResult, aiResult] = portfolioIds.length ? await Promise.all([
    pool.query(`
      SELECT v.id,v.portfolio_id,v.version_number,v.sequence_no,v.stage,v.confidence,v.change_source,
             v.revision_reason,v.previous_version_id,v.content_checksum,v.submitted_at,v.created_by,v.change_summary,
             u.name author_name
      FROM portfolio_versions v
      LEFT JOIN app_users u ON u.id=v.created_by
      WHERE v.portfolio_id=ANY($1::uuid[])
        AND v.change_source IS DISTINCT FROM 'simulation'
      ORDER BY v.portfolio_id,v.sequence_no,v.submitted_at
    `, [portfolioIds]),
    pool.query(`
      SELECT s.*,p.student_id,a.public_id assignment_public_id,v.version_number,u.name evaluator_name
      FROM rubric_submissions s
      JOIN portfolios p ON p.id=s.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=s.version_id
      LEFT JOIN app_users u ON u.id=s.evaluator_id
      WHERE s.portfolio_id=ANY($1::uuid[]) AND s.evaluator_role='teacher'
      ORDER BY s.submitted_at DESC
    `, [portfolioIds]),
    pool.query(`
      SELECT ar.id,ar.portfolio_id,ar.version_id,ar.status,ar.stage,ar.teacher_review_status,
             ar.teacher_id,ar.teacher_reviewed_at,ar.created_at,ar.completed_at,
             a.public_id assignment_public_id,p.student_id,u.name student_name,v.version_number
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=ar.version_id
      JOIN app_users u ON u.id=p.student_id
      WHERE ar.portfolio_id=ANY($1::uuid[])
        AND v.change_source IS DISTINCT FROM 'simulation'
      ORDER BY ar.created_at DESC
    `, [portfolioIds])
  ]) : [{ rows: [] }, { rows: [] }, { rows: [] }];

  const versionsByPortfolio = new Map();
  for (const row of versionsResult.rows) {
    const list = versionsByPortfolio.get(row.portfolio_id) || [];
    list.push(mapVersion(row, false));
    versionsByPortfolio.set(row.portfolio_id, list);
  }

  const portfolios = {};
  for (const row of portfoliosResult.rows) {
    const mapped = mapPortfolio(row, versionsByPortfolio.get(row.id) || []);
    portfolios[mapped.id] = mapped;
  }

  const rubricMap = rubrics;
  const primaryRubric = Object.values(rubricMap)[0] || { id: '', title: 'Rubric', criteria: [] };

  return {
    assignments: assignmentsResult.rows.map(mapAssignment),
    literatureTexts,
    rubric: primaryRubric,
    rubrics: rubricMap,
    portfolios,
    feedbacks: [],
    rubricSubmissions: rubricResult.rows.map(mapRubricSubmission),
    auditLogs: [],
    classes: classesResult.rows,
    users: [],
    aiReviews: aiResult.rows.map(row => mapAiReview(row, false)),
    reflections: []
  };
}

export async function getTeacherWorkspace(user, assignmentPublicId, studentId) {
  assertTeacher(user);
  const assignmentId = clean(assignmentPublicId);
  const targetStudentId = clean(studentId, 80);
  if (!assignmentId) throw new Error('ASSIGNMENT_REQUIRED');
  if (!UUID_RE.test(targetStudentId)) throw new Error('STUDENT_REQUIRED');

  const pool = await getPool();
  const assignmentResult = await pool.query(`
    SELECT a.*,c.code class_code,r.public_id rubric_public_id
    FROM assignments a
    JOIN class_members mine ON mine.class_id=a.class_id AND mine.user_id=$1 AND mine.member_role='teacher'
    JOIN classes c ON c.id=a.class_id
    JOIN rubrics r ON r.id=a.rubric_id
    WHERE a.public_id=$2
    LIMIT 1
  `, [user.id, assignmentId]);
  const assignmentRow = assignmentResult.rows[0];
  if (!assignmentRow) throw new Error('ASSIGNMENT_NOT_FOUND');

  const portfolioResult = await pool.query(`
    SELECT p.id,p.student_id,p.status,p.active_version,p.updated_at,
           a.public_id assignment_public_id,u.name student_name,c.code class_code
    FROM portfolios p
    JOIN assignments a ON a.id=p.assignment_id
    JOIN app_users u ON u.id=p.student_id
    JOIN classes c ON c.id=a.class_id
    WHERE a.id=$1 AND p.student_id=$2
    LIMIT 1
  `, [assignmentRow.id, targetStudentId]);
  const portfolioRow = portfolioResult.rows[0];
  if (!portfolioRow) throw new Error('PORTFOLIO_NOT_FOUND');

  const [versionsResult, feedbackResult, rubricResult, aiResult, reflectionResult, rubricMap, literatureResult] = await Promise.all([
    pool.query(`
      SELECT v.*,u.name author_name
      FROM portfolio_versions v
      LEFT JOIN app_users u ON u.id=v.created_by
      WHERE v.portfolio_id=$1
        AND v.change_source IS DISTINCT FROM 'simulation'
      ORDER BY v.sequence_no,v.submitted_at
    `, [portfolioRow.id]),
    pool.query(`
      SELECT f.*,p.student_id,a.public_id assignment_public_id,v.version_number,u.name author_name
      FROM feedbacks f
      JOIN portfolios p ON p.id=f.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=f.version_id
      LEFT JOIN app_users u ON u.id=f.author_id
      WHERE f.portfolio_id=$1
        AND v.change_source IS DISTINCT FROM 'simulation'
      ORDER BY f.created_at DESC
    `, [portfolioRow.id]),
    pool.query(`
      SELECT s.*,p.student_id,a.public_id assignment_public_id,v.version_number,u.name evaluator_name
      FROM rubric_submissions s
      JOIN portfolios p ON p.id=s.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=s.version_id
      LEFT JOIN app_users u ON u.id=s.evaluator_id
      WHERE s.portfolio_id=$1
      ORDER BY s.submitted_at DESC
    `, [portfolioRow.id]),
    pool.query(`
      SELECT ar.*,a.public_id assignment_public_id,p.student_id,u.name student_name,v.version_number
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=ar.version_id
      JOIN app_users u ON u.id=p.student_id
      WHERE ar.portfolio_id=$1
        AND v.change_source IS DISTINCT FROM 'simulation'
      ORDER BY ar.created_at DESC
    `, [portfolioRow.id]),
    pool.query(`
      SELECT sr.id,sr.version_id,sr.reflection_json,sr.created_at,v.version_number
      FROM student_reflections sr
      JOIN portfolio_versions v ON v.id=sr.version_id
      WHERE sr.portfolio_id=$1
      ORDER BY sr.created_at DESC
    `, [portfolioRow.id]),
    loadRubrics(pool),
    assignmentRow.literature_text_version_id
      ? pool.query(`
          SELECT v.id,lt.public_id logical_public_id,v.version_no,v.content_checksum,
                 v.title,v.author,v.year_text,v.genre,v.synopsis,v.excerpt,v.historical_context,v.tags
          FROM literature_text_versions v
          JOIN literature_texts lt ON lt.id=v.literature_text_id
          WHERE v.id=$1
          LIMIT 1
        `, [assignmentRow.literature_text_version_id])
      : Promise.resolve({ rows: [] })
  ]);

  const versions = versionsResult.rows.map(row => mapVersion(row, true));
  const portfolio = mapPortfolio(portfolioRow, versions);
  const assignment = mapAssignment(assignmentRow);
  const rubric = rubricMap[assignment.rubricId] || { id: '', title: 'Rubric', criteria: [] };
  const literatureRow = literatureResult.rows[0];
  const literatureText = literatureRow ? {
    id: literatureRow.id,
    logicalId: literatureRow.logical_public_id,
    revisionNo: Number(literatureRow.version_no || 1),
    isLatest: false,
    contentChecksum: literatureRow.content_checksum,
    title: literatureRow.title,
    author: literatureRow.author,
    year: literatureRow.year_text || '',
    genre: literatureRow.genre || '',
    synopsis: literatureRow.synopsis || '',
    excerpt: literatureRow.excerpt || '',
    fullContent: '',
    historicalContext: literatureRow.historical_context || '',
    tags: literatureRow.tags || []
  } : null;

  return {
    assignment,
    literatureText,
    portfolio,
    feedbacks: feedbackResult.rows.map(mapFeedback),
    rubricSubmissions: rubricResult.rows.map(mapRubricSubmission),
    aiReviews: aiResult.rows.map(row => mapAiReview(row, true)),
    reflections: reflectionResult.rows.map(row => ({
      id: row.id,
      assignmentId: assignment.id,
      studentId: portfolio.studentId,
      versionId: row.version_id,
      versionNumber: row.version_number,
      reflection: row.reflection_json || {},
      createdAt: row.created_at
    })),
    rubric
  };
}

export async function getTeacherLiteratureCatalog(user) {
  assertTeacher(user);
  const pool = await getPool();
  const result = await pool.query(`
    SELECT v.id,lt.public_id logical_public_id,v.version_no,v.content_checksum,
           v.title,v.author,v.year_text,v.genre,v.synopsis,v.excerpt,v.full_content,v.historical_context,v.tags,
           max(v.version_no) OVER (PARTITION BY v.literature_text_id) latest_version_no
    FROM literature_text_versions v
    JOIN literature_texts lt ON lt.id=v.literature_text_id
    ORDER BY v.title,v.version_no DESC
  `);
  return result.rows.map(row => ({
    id: row.id,
    logicalId: row.logical_public_id,
    revisionNo: Number(row.version_no || 1),
    isLatest: Number(row.version_no) === Number(row.latest_version_no),
    contentChecksum: row.content_checksum,
    title: row.title,
    author: row.author,
    year: row.year_text || '',
    genre: row.genre || '',
    synopsis: row.synopsis || '',
    excerpt: row.excerpt || '',
    fullContent: row.full_content || '',
    historicalContext: row.historical_context || '',
    tags: row.tags || []
  }));
}
