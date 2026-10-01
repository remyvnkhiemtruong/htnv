import { getPool } from './db.js';
import { normalizePoeticContent } from './content-compat.js';

const emptyDraft = () => normalizePoeticContent({});

const removeLockedReadingGuide = template => Object.fromEntries(
  Object.entries(template || {}).filter(([key]) => key !== 'readingGuide' && key !== 'readingSources')
);

const mapVersion = row => ({
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
  responses: row.content_json ? normalizePoeticContent(row.content_json) : emptyDraft(),
  isFrozen: true,
  isSubmitted: true
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
  sourceAiReviewId: row.source_ai_review_id || null
});

const mapRubricSubmission = row => ({
  id: row.id,
  assignmentId: row.assignment_public_id,
  studentId: row.student_id,
  versionId: row.version_id,
  versionNumber: row.version_number,
  evaluatorId: row.evaluator_id || '',
  evaluatorName: row.evaluator_name || '',
  evaluatorRole: row.evaluator_role,
  criterionScores: row.criterion_scores || {},
  overallFeedback: row.overall_feedback || '',
  totalScore: Number(row.total_score || 0),
  maxScore: Number(row.max_score || 0),
  submittedAt: row.submitted_at
});

const mapReflection = row => ({
  id: row.id,
  assignmentId: row.assignment_public_id,
  studentId: row.student_id,
  versionId: row.version_id,
  versionNumber: row.version_number,
  reflection: row.reflection_json || {},
  createdAt: row.created_at
});

const mapAssignment = (row, readingUnlocked) => ({
  id: row.public_id,
  title: row.title,
  textId: row.literature_text_version_id || row.text_public_id || '',
  classId: row.class_code || '',
  assignedDate: row.assigned_at,
  deadline: row.deadline || '',
  difficulty: row.difficulty,
  targetAxes: row.target_axes || [],
  prompt: row.prompt || '',
  guidingSteps: row.guiding_steps || [],
  rubricId: row.rubric_public_id || '',
  starterTemplate: row.starter_template || {},
  aiGuidance: '',
  commonMistakes: '',
  referenceGuide: '',
  predictionTemplate: row.workflow_config?.predictionEnabled !== false && !readingUnlocked
    ? removeLockedReadingGuide(row.prediction_template)
    : (row.prediction_template || {}),
  workflowConfig: row.workflow_config || {}
});

async function loadStudentAssignmentRows(pool, userId, assignmentPublicId = '') {
  const params = [userId];
  let assignmentFilter = '';
  if (assignmentPublicId) {
    params.push(assignmentPublicId);
    assignmentFilter = ' AND a.public_id=$2';
  }
  const result = await pool.query(`
    SELECT
      a.*, c.code class_code, r.public_id rubric_public_id, lt.public_id text_public_id,
      p.id portfolio_id, p.status portfolio_status, p.active_version, p.updated_at portfolio_updated_at,
      d.content_json draft_content_json, d.updated_at draft_updated_at, d.draft_revision,
      u.name student_name
    FROM portfolios p
    JOIN assignments a ON a.id=p.assignment_id
    JOIN classes c ON c.id=a.class_id
    JOIN rubrics r ON r.id=a.rubric_id
    JOIN app_users u ON u.id=p.student_id
    LEFT JOIN literature_texts lt ON lt.id=a.text_id
    LEFT JOIN portfolio_drafts d ON d.portfolio_id=p.id
    WHERE p.student_id=$1
      AND a.status='published'
      ${assignmentFilter}
    ORDER BY a.assigned_at DESC
  `, params);
  return result.rows;
}

async function loadVersions(pool, portfolioIds, includeContent) {
  if (!portfolioIds.length) return [];
  const result = await pool.query(`
    SELECT
      v.id,v.portfolio_id,v.version_number,v.sequence_no,v.stage,v.confidence,v.change_source,
      v.revision_reason,v.previous_version_id,v.content_checksum,v.submitted_at,v.created_by,
      v.change_summary,
      ${includeContent ? 'v.content_json' : 'NULL::jsonb AS content_json'},
      u.name author_name
    FROM portfolio_versions v
    LEFT JOIN app_users u ON u.id=v.created_by
    WHERE v.portfolio_id=ANY($1::uuid[])
      AND v.change_source IS DISTINCT FROM 'simulation'
    ORDER BY v.sequence_no, v.submitted_at
  `, [portfolioIds]);
  return result.rows;
}

async function loadFeedbacks(pool, portfolioIds) {
  if (!portfolioIds.length) return [];
  const result = await pool.query(`
    SELECT f.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name author_name
    FROM feedbacks f
    JOIN portfolios p ON p.id=f.portfolio_id
    JOIN assignments a ON a.id=p.assignment_id
    JOIN portfolio_versions v ON v.id=f.version_id
    LEFT JOIN app_users u ON u.id=f.author_id
    WHERE f.portfolio_id=ANY($1::uuid[])
      AND v.change_source IS DISTINCT FROM 'simulation'
    ORDER BY f.created_at DESC
  `, [portfolioIds]);
  return result.rows;
}

async function loadRubricSubmissions(pool, portfolioIds) {
  if (!portfolioIds.length) return [];
  const result = await pool.query(`
    SELECT s.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name evaluator_name
    FROM rubric_submissions s
    JOIN portfolios p ON p.id=s.portfolio_id
    JOIN assignments a ON a.id=p.assignment_id
    JOIN portfolio_versions v ON v.id=s.version_id
    LEFT JOIN app_users u ON u.id=s.evaluator_id
    WHERE s.portfolio_id=ANY($1::uuid[])
    ORDER BY s.submitted_at DESC
  `, [portfolioIds]);
  return result.rows;
}

async function loadReflections(pool, portfolioIds) {
  if (!portfolioIds.length) return [];
  const result = await pool.query(`
    SELECT sr.id,sr.portfolio_id,sr.version_id,sr.reflection_json,sr.created_at,
           p.student_id,a.public_id assignment_public_id,v.version_number
    FROM student_reflections sr
    JOIN portfolios p ON p.id=sr.portfolio_id
    JOIN assignments a ON a.id=p.assignment_id
    JOIN portfolio_versions v ON v.id=sr.version_id
    WHERE sr.portfolio_id=ANY($1::uuid[])
    ORDER BY sr.created_at DESC
  `, [portfolioIds]);
  return result.rows;
}

async function loadRubric(pool, rubricId) {
  if (!rubricId) return { id: '', title: 'Rubric', criteria: [] };
  const result = await pool.query(`
    SELECT r.public_id rubric_public_id,r.title rubric_title,r.description rubric_description,
           rc.public_id criterion_public_id,rc.axis_id,rc.title criterion_title,
           rc.weight,rc.levels_json,rc.sort_order
    FROM rubrics r
    LEFT JOIN rubric_criteria rc ON rc.rubric_id=r.id
    WHERE r.id=$1
    ORDER BY rc.sort_order,rc.public_id
  `, [rubricId]);
  if (!result.rows.length) return { id: '', title: 'Rubric', criteria: [] };
  const first = result.rows[0];
  return {
    id: first.rubric_public_id,
    title: first.rubric_title,
    description: first.rubric_description || '',
    criteria: result.rows.filter(row => row.criterion_public_id).map(row => ({
      id: row.criterion_public_id,
      axisId: row.axis_id,
      title: row.criterion_title,
      weight: Number(row.weight || 1),
      levels: Array.isArray(row.levels_json) ? row.levels_json : []
    }))
  };
}

async function loadLiteratureSummaryRows(pool, assignmentRows) {
  const versionIds = [...new Set(assignmentRows.map(row => row.literature_text_version_id).filter(Boolean))];
  const logicalIds = [...new Set(
    assignmentRows
      .filter(row => !row.literature_text_version_id)
      .map(row => row.text_id)
      .filter(Boolean)
  )];

  const output = [];
  if (versionIds.length) {
    const rows = await pool.query(`
      SELECT v.id,v.title,v.author,v.year_text,v.genre,v.content_checksum,
             v.version_no,lt.public_id logical_public_id
      FROM literature_text_versions v
      JOIN literature_texts lt ON lt.id=v.literature_text_id
      WHERE v.id=ANY($1::uuid[])
    `, [versionIds]);
    output.push(...rows.rows.map(row => ({
      id: row.id,
      logicalId: row.logical_public_id,
      revisionNo: Number(row.version_no),
      isLatest: false,
      contentChecksum: row.content_checksum,
      title: row.title,
      author: row.author,
      year: row.year_text,
      genre: row.genre,
      synopsis: '',
      excerpt: '',
      fullContent: '',
      historicalContext: '',
      tags: []
    })));
  }
  if (logicalIds.length) {
    const rows = await pool.query(`
      SELECT id,public_id,title,author,year_text,genre
      FROM literature_texts
      WHERE id=ANY($1::uuid[])
    `, [logicalIds]);
    output.push(...rows.rows.map(row => ({
      id: row.public_id,
      logicalId: row.public_id,
      revisionNo: 1,
      isLatest: true,
      title: row.title,
      author: row.author,
      year: row.year_text,
      genre: row.genre,
      synopsis: '',
      excerpt: '',
      fullContent: '',
      historicalContext: '',
      tags: []
    })));
  }
  return output;
}

async function loadLiteratureWorkspace(pool, assignmentRow, locked) {
  if (assignmentRow.literature_text_version_id) {
    const result = await pool.query(`
      SELECT v.*,lt.public_id logical_public_id,
             v.version_no=(SELECT max(v2.version_no) FROM literature_text_versions v2 WHERE v2.literature_text_id=v.literature_text_id) is_latest
      FROM literature_text_versions v
      JOIN literature_texts lt ON lt.id=v.literature_text_id
      WHERE v.id=$1
      LIMIT 1
    `, [assignmentRow.literature_text_version_id]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      logicalId: row.logical_public_id,
      revisionNo: Number(row.version_no),
      isLatest: Boolean(row.is_latest),
      contentChecksum: row.content_checksum,
      title: row.title,
      author: row.author,
      year: row.year_text,
      genre: row.genre,
      synopsis: locked ? '' : row.synopsis,
      excerpt: locked ? '' : row.excerpt,
      fullContent: locked ? '' : row.full_content,
      historicalContext: locked ? '' : row.historical_context,
      tags: row.tags || []
    };
  }

  if (!assignmentRow.text_id) return null;
  const result = await pool.query(`
    SELECT id,public_id,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags
    FROM literature_texts
    WHERE id=$1
    LIMIT 1
  `, [assignmentRow.text_id]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.public_id,
    logicalId: row.public_id,
    revisionNo: 1,
    isLatest: true,
    title: row.title,
    author: row.author,
    year: row.year_text,
    genre: row.genre,
    synopsis: locked ? '' : row.synopsis,
    excerpt: locked ? '' : row.excerpt,
    fullContent: locked ? '' : row.full_content,
    historicalContext: locked ? '' : row.historical_context,
    tags: row.tags || []
  };
}

function portfolioFromRow(row, versions, includeDraft) {
  const id = `port-${row.student_id}-${row.public_id}`;
  return {
    id,
    dbId: row.portfolio_id,
    assignmentId: row.public_id,
    studentId: row.student_id,
    studentName: row.student_name,
    className: row.class_code,
    currentDraft: includeDraft ? normalizePoeticContent(row.draft_content_json || {}) : emptyDraft(),
    lastAutosavedAt: includeDraft ? (row.draft_updated_at || row.portfolio_updated_at) : row.portfolio_updated_at,
    draftRevision: includeDraft ? Number(row.draft_revision || 0) : 0,
    versions,
    currentActiveVersion: versions.length ? row.active_version : 'Bản nháp',
    status: row.portfolio_status
  };
}

export async function getStudentOverview(user) {
  if (user?.role !== 'student') throw new Error('FORBIDDEN');
  const pool = await getPool();
  const assignmentRows = await loadStudentAssignmentRows(pool, user.id);
  const portfolioIds = assignmentRows.map(row => row.portfolio_id).filter(Boolean);

  const [versionRows, feedbackRows, rubricRows, reflectionRows, literatureTexts] = await Promise.all([
    loadVersions(pool, portfolioIds, false),
    loadFeedbacks(pool, portfolioIds),
    loadRubricSubmissions(pool, portfolioIds),
    loadReflections(pool, portfolioIds),
    loadLiteratureSummaryRows(pool, assignmentRows)
  ]);

  const versionsByPortfolio = new Map();
  for (const row of versionRows) {
    if (!versionsByPortfolio.has(row.portfolio_id)) versionsByPortfolio.set(row.portfolio_id, []);
    versionsByPortfolio.get(row.portfolio_id).push(mapVersion(row));
  }

  const portfolios = {};
  const assignments = [];
  for (const row of assignmentRows) {
    const versions = versionsByPortfolio.get(row.portfolio_id) || [];
    const readingUnlocked = row.portfolio_status === 'completed' || versions.some(version => version.stage === 'prediction');
    const assignment = mapAssignment(row, readingUnlocked);
    assignments.push(assignment);
    const portfolio = portfolioFromRow(row, versions, false);
    portfolios[portfolio.id] = portfolio;
  }

  return {
    assignments,
    literatureTexts,
    portfolios,
    feedbacks: feedbackRows.map(mapFeedback),
    rubricSubmissions: rubricRows.map(mapRubricSubmission),
    reflections: reflectionRows.map(mapReflection)
  };
}

export async function getStudentWorkspace(user, assignmentPublicId) {
  if (user?.role !== 'student') throw new Error('FORBIDDEN');
  const assignmentId = String(assignmentPublicId || '').trim().slice(0, 200);
  if (!assignmentId) throw new Error('ASSIGNMENT_NOT_FOUND');

  const pool = await getPool();
  const assignmentRows = await loadStudentAssignmentRows(pool, user.id, assignmentId);
  const row = assignmentRows[0];
  if (!row) throw new Error('ASSIGNMENT_NOT_FOUND');

  const [versionRows, feedbackRows, rubricRows, reflectionRows, rubric] = await Promise.all([
    loadVersions(pool, [row.portfolio_id], true),
    loadFeedbacks(pool, [row.portfolio_id]),
    loadRubricSubmissions(pool, [row.portfolio_id]),
    loadReflections(pool, [row.portfolio_id]),
    loadRubric(pool, row.rubric_id)
  ]);

  const versions = versionRows.map(mapVersion);
  const readingUnlocked = row.portfolio_status === 'completed' || versions.some(version => version.stage === 'prediction');
  const assignment = mapAssignment(row, readingUnlocked);
  const literatureText = await loadLiteratureWorkspace(
    pool,
    row,
    row.workflow_config?.predictionEnabled !== false && !readingUnlocked
  );

  return {
    assignment,
    literatureText,
    portfolio: portfolioFromRow(row, versions, true),
    feedbacks: feedbackRows.map(mapFeedback),
    rubricSubmissions: rubricRows.map(mapRubricSubmission),
    reflections: reflectionRows.map(mapReflection),
    rubric
  };
}
