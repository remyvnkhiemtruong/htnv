import { createHash, createHmac, randomUUID } from 'node:crypto';
import { getPool } from './db.js';

export const AXES = [
  'plot_situation',
  'character_detail',
  'narrator_pov',
  'space_time',
  'language_tone_symbol',
  'form_argument'
];

const ALLOWED_STAGES = new Set(['prediction', 'initial', 'revision']);
const ALLOWED_DECISIONS = new Set(['approved', 'revised', 'rejected']);
const ALLOWED_DIFFICULTY = new Set(['Cơ bản', 'Nâng cao', 'Chuyên sâu']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let capabilitiesPromise = null;

export function stableValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableValue);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

export function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

export function checksumContent(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function emptyDraft() {
  return Object.fromEntries(AXES.map(axisId => [axisId, { axisId, analysisText: '', evidenceQuotes: [] }]));
}

function anonymousCriterionScores(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).flatMap(([id, value]) => {
    const score = value?.score == null ? null : Number(value.score);
    const level = value?.level == null ? null : Number(value.level);
    const numeric = {
      ...(score !== null && Number.isFinite(score) ? { score } : {}),
      ...(level !== null && Number.isFinite(level) ? { level } : {})
    };
    return Object.keys(numeric).length ? [[id, { ...numeric, note: '' }]] : [];
  }));
}

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function cleanText(value, max = 10000) {
  return String(value ?? '').slice(0, max);
}

function cleanTrimmed(value, max = 10000) {
  return cleanText(value, max).trim();
}

function cleanStringArray(value, maxItems = 30, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanTrimmed(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function normalizeDraft(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const normalized = {};
  for (const axisId of AXES) {
    const raw = source[axisId] && typeof source[axisId] === 'object' ? source[axisId] : {};
    const rawQuotes = Array.isArray(raw.evidenceQuotes) ? raw.evidenceQuotes : [];
    normalized[axisId] = {
      axisId,
      analysisText: cleanText(raw.analysisText, 120000),
      evidenceQuotes: rawQuotes.slice(0, 100).map((quote, index) => ({
        id: cleanTrimmed(quote?.id || `${axisId}-${index + 1}`, 120),
        text: cleanText(quote?.text, 12000),
        ...(quote?.contextNote ? { contextNote: cleanText(quote.contextNote, 4000) } : {}),
        ...(quote?.pageOrParagraph ? { pageOrParagraph: cleanText(quote.pageOrParagraph, 500) } : {})
      })),
      ...(raw.studentNotes ? { studentNotes: cleanText(raw.studentNotes, 10000) } : {}),
      ...(Array.isArray(raw.conceptTags) ? { conceptTags: cleanStringArray(raw.conceptTags, 30, 80) } : {})
    };
  }
  const bytes = Buffer.byteLength(JSON.stringify(normalized), 'utf8');
  if (bytes > 800000) throw new Error('CONTENT_TOO_LARGE');
  return normalized;
}

function wordCount(content) {
  return Object.values(content || {}).reduce((sum, response) => {
    const text = String(response?.analysisText || '').trim();
    return sum + (text ? text.split(/\s+/u).filter(Boolean).length : 0);
  }, 0);
}

function clientIp(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 100);
}

export function assertSameOrigin(req) {
  const origin = String(req?.headers?.origin || '');
  if (!origin) return;
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '');
  let originHost = '';
  try { originHost = new URL(origin).host; } catch { throw new Error('CSRF_ORIGIN_MISMATCH'); }
  if (!host || originHost !== host) throw new Error('CSRF_ORIGIN_MISMATCH');
}

async function audit(client, user, action, targetType, targetId, afterJson = null, req = null) {
  await client.query(`
    INSERT INTO audit_logs(actor_id, actor_role, action, target_type, target_id, after_json, ip_address)
    VALUES($1,$2,$3,$4,$5,$6,$7)
  `, [
    user?.id || null,
    user?.role || 'system',
    action,
    cleanTrimmed(targetType, 80),
    cleanTrimmed(targetId, 200),
    afterJson ? JSON.stringify(afterJson) : null,
    req ? clientIp(req) : ''
  ]);
}

export async function markPortfolioFeedbackReceived(client, portfolioId) {
  const updated = await client.query(`
    UPDATE portfolios
    SET status='feedback_received', updated_at=now()
    WHERE id=$1
      AND status NOT IN ('waiting_official_rubric','completed')
    RETURNING status
  `, [portfolioId]);
  if (updated.rows[0]?.status) return updated.rows[0].status;
  const existing = await client.query('SELECT status FROM portfolios WHERE id=$1 LIMIT 1', [portfolioId]);
  return existing.rows[0]?.status || null;
}

async function capabilities() {
  if (!capabilitiesPromise) {
    capabilitiesPromise = (async () => {
      const pool = await getPool();
      const result = await pool.query(`
        SELECT
          to_regclass('public.literature_text_versions') IS NOT NULL AS has_text_versions,
          EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name='assignments' AND column_name='literature_text_version_id'
          ) AS has_assignment_text_version
      `);
      return {
        textVersioning: Boolean(result.rows[0]?.has_text_versions && result.rows[0]?.has_assignment_text_version)
      };
    })().catch(error => {
      capabilitiesPromise = null;
      throw error;
    });
  }
  return capabilitiesPromise;
}

export function clearCapabilityCacheForTests() {
  capabilitiesPromise = null;
}

function pseudonymSecret() {
  const value = process.env.RESEARCH_PSEUDONYM_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error('PSEUDONYM_SECRET_NOT_CONFIGURED');
  return value;
}

function pseudonym(prefix, value) {
  const digest = createHmac('sha256', pseudonymSecret()).update(`${prefix}:${value}`).digest('hex').slice(0, 12).toUpperCase();
  return `${prefix}-${digest}`;
}

async function teacherCanAccessClass(client, classId, teacherId) {
  const result = await client.query(`
    SELECT 1 FROM class_members
    WHERE class_id=$1 AND user_id=$2 AND member_role='teacher'
    LIMIT 1
  `, [classId, teacherId]);
  return result.rows.length > 0;
}

async function portfolioForStudent(client, assignmentPublicId, studentId, lock = false) {
  const result = await client.query(`
    SELECT p.*, a.public_id assignment_public_id, a.id assignment_db_id, a.class_id,
           a.rubric_id, a.prompt, a.target_axes, a.workflow_config, a.status assignment_status
    FROM portfolios p
    JOIN assignments a ON a.id=p.assignment_id
    WHERE a.public_id=$1 AND p.student_id=$2
    LIMIT 1
    ${lock ? 'FOR UPDATE OF p' : ''}
  `, [assignmentPublicId, studentId]);
  return result.rows[0] || null;
}

async function exactPeerScope(client, reviewerId, versionId) {
  if (!isUuid(versionId)) return null;
  const result = await client.query(`
    SELECT pra.id peer_assignment_id, pra.status peer_status, pra.version_id,
           p.id portfolio_id, p.student_id, a.id assignment_db_id, a.public_id assignment_public_id,
           a.class_id, a.rubric_id
    FROM peer_review_assignments pra
    JOIN assignments a ON a.id=pra.assignment_id
    JOIN portfolios p ON p.assignment_id=a.id AND p.student_id=pra.student_id
    WHERE pra.reviewer_id=$1 AND pra.version_id=$2
      AND EXISTS(SELECT 1 FROM portfolio_versions v WHERE v.id=pra.version_id AND v.portfolio_id=p.id)
    LIMIT 1
  `, [reviewerId, versionId]);
  return result.rows[0] || null;
}

async function getRubricMap(pool, accessibleAssignmentIds = null, includeAll = false) {
  const params = [];
  let where = '';
  if (!includeAll && Array.isArray(accessibleAssignmentIds)) {
    if (!accessibleAssignmentIds.length) return {};
    params.push(accessibleAssignmentIds);
    where = `WHERE r.id IN (SELECT DISTINCT rubric_id FROM assignments WHERE id=ANY($1::uuid[]))`;
  }
  const result = await pool.query(`
    SELECT r.id rubric_db_id, r.public_id rubric_public_id, r.title rubric_title,
           r.description rubric_description, r.is_active,
           rc.public_id criterion_public_id, rc.axis_id, rc.title criterion_title,
           rc.weight, rc.levels_json, rc.sort_order
    FROM rubrics r
    LEFT JOIN rubric_criteria rc ON rc.rubric_id=r.id
    ${where}
    ORDER BY r.created_at DESC, rc.sort_order, rc.public_id
  `, params);
  const map = {};
  for (const row of result.rows) {
    if (!map[row.rubric_public_id]) {
      map[row.rubric_public_id] = {
        id: row.rubric_public_id,
        title: row.rubric_title,
        description: row.rubric_description || '',
        criteria: []
      };
    }
    if (row.criterion_public_id) {
      map[row.rubric_public_id].criteria.push({
        id: row.criterion_public_id,
        axisId: row.axis_id,
        title: row.criterion_title,
        weight: Number(row.weight || 1),
        levels: Array.isArray(row.levels_json) ? row.levels_json : []
      });
    }
  }
  return map;
}

async function loadRoleScope(pool, user) {
  const role = user.role;
  if (role === 'admin') {
    const assignments = await pool.query('SELECT id FROM assignments ORDER BY assigned_at DESC');
    const portfolios = await pool.query('SELECT id FROM portfolios ORDER BY updated_at DESC');
    return { assignmentIds: assignments.rows.map(r => r.id), portfolioIds: portfolios.rows.map(r => r.id) };
  }
  if (role === 'teacher') {
    const assignments = await pool.query(`
      SELECT a.id FROM assignments a
      JOIN class_members cm ON cm.class_id=a.class_id AND cm.user_id=$1 AND cm.member_role='teacher'
      ORDER BY a.assigned_at DESC
    `, [user.id]);
    const assignmentIds = assignments.rows.map(r => r.id);
    if (!assignmentIds.length) return { assignmentIds: [], portfolioIds: [] };
    const portfolios = await pool.query('SELECT id FROM portfolios WHERE assignment_id=ANY($1::uuid[])', [assignmentIds]);
    return { assignmentIds, portfolioIds: portfolios.rows.map(r => r.id) };
  }
  if (role === 'student') {
    const portfolios = await pool.query(`
      SELECT p.id, p.assignment_id
      FROM portfolios p
      JOIN assignments a ON a.id=p.assignment_id
      WHERE p.student_id=$1 AND a.status='published'
      ORDER BY p.updated_at DESC
    `, [user.id]);
    return {
      assignmentIds: [...new Set(portfolios.rows.map(r => r.assignment_id))],
      portfolioIds: portfolios.rows.map(r => r.id)
    };
  }
  if (role === 'peer') {
    const rows = await pool.query(`
      SELECT DISTINCT p.id portfolio_id, a.id assignment_id, pra.version_id
      FROM peer_review_assignments pra
      JOIN assignments a ON a.id=pra.assignment_id
      JOIN portfolios p ON p.assignment_id=a.id AND p.student_id=pra.student_id
      WHERE pra.reviewer_id=$1 AND pra.version_id IS NOT NULL
    `, [user.id]);
    return {
      assignmentIds: [...new Set(rows.rows.map(r => r.assignment_id))],
      portfolioIds: [...new Set(rows.rows.map(r => r.portfolio_id))],
      versionIds: [...new Set(rows.rows.map(r => r.version_id).filter(Boolean))]
    };
  }
  if (role === 'ai') {
    const rows = await pool.query(`
      SELECT DISTINCT ar.portfolio_id, p.assignment_id, ar.version_id
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      WHERE ar.status IN ('pending','in_progress','completed')
        AND ar.teacher_review_status='pending'
        AND (ar.reviewer_id IS NULL OR ar.reviewer_id=$1)
    `, [user.id]);
    return {
      assignmentIds: [...new Set(rows.rows.map(r => r.assignment_id))],
      portfolioIds: [...new Set(rows.rows.map(r => r.portfolio_id))],
      versionIds: [...new Set(rows.rows.map(r => r.version_id))]
    };
  }
  if (role === 'researcher') {
    const assignments = await pool.query('SELECT id FROM assignments ORDER BY assigned_at DESC');
    const portfolios = await pool.query('SELECT id FROM portfolios ORDER BY updated_at DESC');
    return { assignmentIds: assignments.rows.map(r => r.id), portfolioIds: portfolios.rows.map(r => r.id) };
  }
  return { assignmentIds: [], portfolioIds: [] };
}

async function loadLiterature(pool, assignmentRows, role, textVersioning, userId = '') {
  const assignmentDbIds = [...new Set(assignmentRows.map(row => row.id).filter(Boolean))];
  const lockedLogicalIds = new Set();
  const lockedVersionIds = new Set();
  if (role === 'student' && userId && assignmentDbIds.length) {
    const pending = await pool.query(`
      SELECT DISTINCT a.text_id, a.literature_text_version_id
      FROM assignments a
      JOIN portfolios p ON p.assignment_id=a.id AND p.student_id=$1
      WHERE a.id=ANY($2::uuid[])
        AND COALESCE((a.workflow_config->>'predictionEnabled')::boolean, true)=true
        AND NOT EXISTS(
          SELECT 1 FROM portfolio_versions v
          WHERE v.portfolio_id=p.id AND v.stage='prediction'
        )
    `, [userId, assignmentDbIds]);
    for (const row of pending.rows) {
      if (row.text_id) lockedLogicalIds.add(row.text_id);
      if (row.literature_text_version_id) lockedVersionIds.add(row.literature_text_version_id);
    }
  }
  const lockedForStudent = (logicalId, versionId) =>
    role === 'student' && (lockedLogicalIds.has(logicalId) || lockedVersionIds.has(versionId));
  if (!textVersioning) {
    const logicalIds = [...new Set(assignmentRows.map(r => r.text_id).filter(Boolean))];
    if (!logicalIds.length) return [];
    const result = await pool.query(`
      SELECT id, public_id, title, author, year_text, genre, synopsis, excerpt, full_content,
             historical_context, tags
      FROM literature_texts WHERE id=ANY($1::uuid[]) ORDER BY title
    `, [logicalIds]);
    return result.rows.map(row => {
      const locked = lockedForStudent(row.id, '');
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
    });
  }

  const exactIds = [...new Set(assignmentRows.map(r => r.literature_text_version_id).filter(Boolean))];
  let rows = [];
  if (exactIds.length) {
    const result = await pool.query(`
      SELECT v.*, lt.public_id logical_public_id,
             v.version_no = (SELECT max(v2.version_no) FROM literature_text_versions v2 WHERE v2.literature_text_id=v.literature_text_id) AS is_latest
      FROM literature_text_versions v
      JOIN literature_texts lt ON lt.id=v.literature_text_id
      WHERE v.id=ANY($1::uuid[])
    `, [exactIds]);
    rows.push(...result.rows);
  }
  if (role === 'teacher' || role === 'admin') {
    const latest = await pool.query(`
      SELECT DISTINCT ON(v.literature_text_id) v.*, lt.public_id logical_public_id, true AS is_latest
      FROM literature_text_versions v
      JOIN literature_texts lt ON lt.id=v.literature_text_id
      ORDER BY v.literature_text_id, v.version_no DESC
    `);
    rows.push(...latest.rows);
  }
  const byId = new Map();
  for (const row of rows) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => String(a.title).localeCompare(String(b.title), 'vi')).map(row => {
    const locked = lockedForStudent(row.literature_text_id, row.id);
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
  });
}

export async function getAcademicSnapshot(user) {
  const pool = await getPool();
  const caps = await capabilities();
  const scope = await loadRoleScope(pool, user);
  const assignmentIds = scope.assignmentIds || [];
  const portfolioIds = scope.portfolioIds || [];
  const role = user.role;

  const assignmentRows = assignmentIds.length ? (await pool.query(`
    SELECT a.*, c.code class_code, r.public_id rubric_public_id
    ${caps.textVersioning ? ', a.literature_text_version_id' : ''}
    FROM assignments a
    JOIN classes c ON c.id=a.class_id
    JOIN rubrics r ON r.id=a.rubric_id
    WHERE a.id=ANY($1::uuid[])
      AND ($2::text <> 'student' OR a.status <> 'draft')
    ORDER BY a.assigned_at DESC
  `, [assignmentIds, role])).rows : [];

  const rubrics = await getRubricMap(pool, assignmentIds, role === 'teacher' || role === 'admin');
  const primaryRubric = Object.values(rubrics)[0] || { id: '', title: 'Rubric', criteria: [] };
  const literatureTexts = await loadLiterature(pool, assignmentRows, role, caps.textVersioning, user.id);

  let portfolioRows = [];
  if (portfolioIds.length) {
    portfolioRows = (await pool.query(`
      SELECT p.*, a.public_id assignment_public_id, a.id assignment_db_id,
             u.name student_name, c.code class_code,
             ${role === 'student' ? 'd.content_json' : 'NULL::jsonb AS content_json'},
             ${role === 'student' ? 'd.updated_at' : 'NULL::timestamptz AS draft_updated_at'},
             ${role === 'student' ? 'd.draft_revision' : 'NULL::bigint AS draft_revision'}
      FROM portfolios p
      JOIN assignments a ON a.id=p.assignment_id
      JOIN app_users u ON u.id=p.student_id
      JOIN classes c ON c.id=a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id=p.id
      WHERE p.id=ANY($1::uuid[])
      ORDER BY p.updated_at DESC
    `, [portfolioIds])).rows;
  }

  let versionRows = [];
  if (portfolioIds.length && role !== 'researcher') {
    if ((role === 'peer' || role === 'ai') && Array.isArray(scope.versionIds)) {
      versionRows = scope.versionIds.length ? (await pool.query(`
        SELECT v.*, u.name author_name FROM portfolio_versions v
        LEFT JOIN app_users u ON u.id=v.created_by
        WHERE v.id=ANY($1::uuid[]) AND v.portfolio_id=ANY($2::uuid[])
          AND v.change_source IS DISTINCT FROM 'simulation'
        ORDER BY v.sequence_no, v.submitted_at
      `, [scope.versionIds, portfolioIds])).rows : [];
    } else {
      versionRows = (await pool.query(`
        SELECT v.*, u.name author_name FROM portfolio_versions v
        LEFT JOIN app_users u ON u.id=v.created_by
        WHERE v.portfolio_id=ANY($1::uuid[])
          AND v.change_source IS DISTINCT FROM 'simulation'
        ORDER BY v.sequence_no, v.submitted_at
      `, [portfolioIds])).rows;
    }
  } else if (portfolioIds.length && role === 'researcher') {
    versionRows = (await pool.query(`
      SELECT id, portfolio_id, version_number, sequence_no, stage, confidence, change_source,
             submitted_at, content_checksum
      FROM portfolio_versions
      WHERE portfolio_id=ANY($1::uuid[])
        AND change_source IS DISTINCT FROM 'simulation'
      ORDER BY sequence_no, submitted_at
    `, [portfolioIds])).rows;
  }

  const versionsByPortfolio = new Map();
  for (const row of versionRows) {
    if (!versionsByPortfolio.has(row.portfolio_id)) versionsByPortfolio.set(row.portfolio_id, []);
    const researcher = role === 'researcher';
    versionsByPortfolio.get(row.portfolio_id).push({
      id: researcher ? pseudonym('VER', row.id) : row.id,
      versionNumber: row.version_number,
      sequenceNo: Number(row.sequence_no || 0),
      stage: row.stage,
      confidence: row.confidence === null ? null : Number(row.confidence),
      changeSource: researcher ? null : row.change_source,
      revisionReason: researcher ? null : row.revision_reason,
      previousVersionId: researcher ? null : row.previous_version_id,
      contentChecksum: row.content_checksum,
      submissionKey: null,
      createdAt: row.submitted_at,
      createdBy: researcher ? '' : (row.created_by || ''),
      authorName: researcher ? 'Tác giả ẩn danh' : (row.author_name || ''),
      changeSummary: researcher ? '' : (row.change_summary || ''),
      responses: researcher ? emptyDraft() : (row.content_json || emptyDraft()),
      isFrozen: true,
      isSubmitted: true
    });
  }

  const portfolios = {};
  for (const row of portfolioRows) {
    const researcher = role === 'researcher';
    const peerOrAi = role === 'peer' || role === 'ai';
    const studentId = researcher
      ? pseudonym('HS', row.student_id)
      : peerOrAi
        ? pseudonym('SUB', row.student_id)
        : row.student_id;
    const id = `port-${studentId}-${row.assignment_public_id}`;
    const versions = versionsByPortfolio.get(row.id) || [];
    portfolios[id] = {
      id,
      dbId: researcher || peerOrAi ? '' : row.id,
      assignmentId: row.assignment_public_id,
      studentId,
      studentName: researcher || peerOrAi ? studentId : row.student_name,
      className: researcher ? pseudonym('COHORT', row.class_code) : peerOrAi ? '' : row.class_code,
      currentDraft: role === 'student' ? (row.content_json || emptyDraft()) : emptyDraft(),
      lastAutosavedAt: role === 'student' ? (row.draft_updated_at || row.updated_at) : row.updated_at,
      draftRevision: role === 'student' ? Number(row.draft_revision || 0) : 0,
      versions,
      currentActiveVersion: versions.length ? row.active_version : 'Bản nháp',
      status: row.status
    };
  }

  const studentReadingUnlocked = new Set();
  if (role === 'student') {
    const predictedPortfolioIds = new Set(versionRows.filter(version => version.stage === 'prediction').map(version => version.portfolio_id));
    for (const portfolio of portfolioRows) {
      if (portfolio.status === 'completed' || predictedPortfolioIds.has(portfolio.id)) {
        studentReadingUnlocked.add(portfolio.assignment_db_id);
      }
    }
  }
  const assignments = assignmentRows.map(row => ({
    id: row.public_id,
    title: row.title,
    textId: caps.textVersioning ? row.literature_text_version_id : '',
    classId: role === 'researcher' ? pseudonym('COHORT', row.class_code) : (role === 'peer' || role === 'ai' ? '' : row.class_code),
    assignedDate: row.assigned_at,
    deadline: row.deadline || '',
    difficulty: row.difficulty,
    targetAxes: row.target_axes || [],
    prompt: row.prompt,
    guidingSteps: row.guiding_steps || [],
    rubricId: row.rubric_public_id,
    starterTemplate: row.starter_template || {},
    aiGuidance: role === 'student' || role === 'peer' || role === 'researcher' ? '' : (row.ai_guidance || ''),
    commonMistakes: role === 'student' || role === 'peer' || role === 'researcher' ? '' : (row.common_mistakes || ''),
    referenceGuide: role === 'student' || role === 'peer' || role === 'researcher' ? '' : (row.reference_guide || ''),
    predictionTemplate: role === 'student'
      && row.workflow_config?.predictionEnabled !== false
      && !studentReadingUnlocked.has(row.id)
      ? Object.fromEntries(Object.entries(row.prediction_template || {}).filter(([key]) => key !== 'readingGuide' && key !== 'readingSources'))
      : (row.prediction_template || {}),
    workflowConfig: row.workflow_config || {}
  }));

  if (!caps.textVersioning) {
    const logical = assignmentRows.map(row => ({ dbId: row.text_id, assignmentId: row.public_id }));
    if (logical.length) {
      const ids = [...new Set(logical.map(x => x.dbId))];
      const rows = await pool.query('SELECT id, public_id FROM literature_texts WHERE id=ANY($1::uuid[])', [ids]);
      const map = new Map(rows.rows.map(r => [r.id, r.public_id]));
      for (const assignment of assignments) {
        const source = logical.find(x => x.assignmentId === assignment.id);
        assignment.textId = source ? (map.get(source.dbId) || '') : '';
      }
    }
  }

  let feedbacks = [];
  if (portfolioIds.length && !['ai'].includes(role)) {
    let where = 'f.portfolio_id=ANY($1::uuid[])';
    const params = [portfolioIds];
    if (role === 'peer') {
      params.push(user.id, scope.versionIds || []);
      where += ' AND f.author_id=$2 AND f.version_id=ANY($3::uuid[])';
    }
    where += " AND v.change_source IS DISTINCT FROM 'simulation'";
    const rows = await pool.query(`
      SELECT f.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name author_name
      FROM feedbacks f
      JOIN portfolios p ON p.id=f.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=f.version_id
      LEFT JOIN app_users u ON u.id=f.author_id
      WHERE ${where}
      ORDER BY f.created_at DESC
    `, params);
    feedbacks = rows.rows.map(row => {
      const researcher = role === 'researcher';
      const studentId = researcher ? pseudonym('HS', row.student_id) : row.student_id;
      return {
        id: researcher ? pseudonym('FB', row.id) : row.id,
        assignmentId: row.assignment_public_id,
        studentId,
        versionId: researcher ? pseudonym('VER', row.version_id) : row.version_id,
        versionNumber: row.version_number,
        axisId: row.axis_id,
        selectedSnippet: researcher ? '' : row.selected_snippet,
        comment: researcher ? '' : row.comment,
        authorId: researcher ? '' : (row.author_id || ''),
        authorName: researcher ? (row.author_role === 'teacher' ? 'Giáo viên' : 'Bạn học') : (row.author_name || ''),
        authorRole: row.author_role,
        createdAt: row.created_at,
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at || null,
        resolvedByVersionId: researcher ? null : (row.resolved_by_version_id || null),
        sourceAiReviewId: researcher ? null : (row.source_ai_review_id || null),
        anchor: researcher ? null : (row.anchor_json || null)
      };
    });
  }

  let rubricSubmissions = [];
  if (portfolioIds.length && !['ai'].includes(role)) {
    const params = [portfolioIds];
    let extra = '';
    if (role === 'researcher') extra = " AND s.evaluator_role='teacher'";
    if (role === 'peer') { params.push(user.id, scope.versionIds || []); extra = ' AND s.evaluator_id=$2 AND s.version_id=ANY($3::uuid[])'; }
    const rows = await pool.query(`
      SELECT s.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name evaluator_name
      FROM rubric_submissions s
      JOIN portfolios p ON p.id=s.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=s.version_id
      LEFT JOIN app_users u ON u.id=s.evaluator_id
      WHERE s.portfolio_id=ANY($1::uuid[])${extra}
      ORDER BY s.submitted_at DESC
    `, params);
    rubricSubmissions = rows.rows.map(row => {
      const researcher = role === 'researcher';
      return {
        id: researcher ? pseudonym('RUB', row.id) : row.id,
        assignmentId: row.assignment_public_id,
        studentId: researcher ? pseudonym('HS', row.student_id) : row.student_id,
        versionId: researcher ? pseudonym('VER', row.version_id) : row.version_id,
        versionNumber: row.version_number,
        evaluatorId: researcher ? '' : (row.evaluator_id || ''),
        evaluatorName: researcher
          ? 'Giáo viên'
          : (row.evaluator_name || (row.evaluator_role === 'teacher' ? 'Giáo viên' : row.evaluator_role === 'peer' ? 'Đồng đẳng' : 'Tự đánh giá')),
        evaluatorRole: row.evaluator_role,
        criterionScores: researcher ? anonymousCriterionScores(row.criterion_scores) : (row.criterion_scores || {}),
        overallFeedback: researcher ? '' : (row.overall_feedback || ''),
        totalScore: Number(row.total_score),
        maxScore: Number(row.max_score),
        submittedAt: row.submitted_at
      };
    });
  }

  let classes = [];
  if (role === 'admin' || role === 'teacher' || role === 'student') {
    const params = [];
    let where = '';
    if (role === 'teacher') { params.push(user.id); where = "WHERE EXISTS(SELECT 1 FROM class_members mine WHERE mine.class_id=c.id AND mine.user_id=$1 AND mine.member_role='teacher')"; }
    if (role === 'student') { params.push(user.id); where = 'WHERE EXISTS(SELECT 1 FROM class_members mine WHERE mine.class_id=c.id AND mine.user_id=$1)'; }
    const rows = await pool.query(`
      SELECT c.id, c.code, c.name, c.school_year,
             count(*) FILTER(WHERE cm.member_role='student')::int student_count
      FROM classes c LEFT JOIN class_members cm ON cm.class_id=c.id
      ${where}
      GROUP BY c.id ORDER BY c.code
    `, params);
    classes = rows.rows;
  }

  let users = [];
  if (role === 'admin') {
    const rows = await pool.query(`
      SELECT id,email,name,role,account_status,must_change_password,created_at,last_login,profile_json
      FROM app_users ORDER BY created_at DESC
    `);
    users = rows.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      accountStatus: row.account_status,
      mustChangePassword: Boolean(row.must_change_password),
      lastLogin: row.last_login || null,
      profile: row.profile_json || {}
    }));
  }

  let aiReviews = [];
  if (role === 'admin' || role === 'teacher' || role === 'ai') {
    const params = [];
    let where = '';
    if (role === 'teacher') {
      params.push(user.id);
      where = "WHERE EXISTS(SELECT 1 FROM class_members cm WHERE cm.class_id=a.class_id AND cm.user_id=$1 AND cm.member_role='teacher')";
    } else if (role === 'ai') {
      params.push(user.id);
      where = "WHERE ar.status IN ('pending','in_progress','completed') AND ar.teacher_review_status='pending' AND (ar.reviewer_id IS NULL OR ar.reviewer_id=$1)";
    }
    where = where
      ? `${where} AND v.change_source IS DISTINCT FROM 'simulation'`
      : "WHERE v.change_source IS DISTINCT FROM 'simulation'";
    const rows = await pool.query(`
      SELECT ar.*, a.public_id assignment_public_id, p.student_id, u.name student_name, v.version_number
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=ar.version_id
      JOIN app_users u ON u.id=p.student_id
      ${where}
      ORDER BY ar.created_at DESC
    `, params);
    aiReviews = rows.rows.map(row => ({
      id: row.id,
      assignment_id: row.assignment_public_id,
      student_id: role === 'ai' ? pseudonym('SUB', row.student_id) : row.student_id,
      student_name: role === 'ai' ? pseudonym('SUB', row.student_id) : row.student_name,
      version_number: row.version_number,
      version_id: row.version_id,
      portfolio_id: role === 'ai' ? '' : row.portfolio_id,
      status: row.status,
      prompt: row.prompt,
      response: role === 'ai' || role === 'teacher' || role === 'admin' ? row.response : '',
      final_response: role === 'teacher' || role === 'admin' ? row.final_response : '',
      stage: row.stage,
      teacher_review_status: row.teacher_review_status,
      teacher_note: role === 'teacher' || role === 'admin' ? row.teacher_note : '',
      teacher_id: role === 'admin' ? row.teacher_id : null,
      teacher_reviewed_at: row.teacher_reviewed_at || null,
      created_at: row.created_at,
      completed_at: row.completed_at || null
    }));
  }

  let auditLogs = [];
  if (role === 'admin') {
    const rows = await pool.query(`
      SELECT l.id,l.created_at,l.action,l.target_type,l.target_id,l.actor_role,u.name actor_name,l.ip_address
      FROM audit_logs l LEFT JOIN app_users u ON u.id=l.actor_id
      ORDER BY l.created_at DESC LIMIT 200
    `);
    auditLogs = rows.rows.map(row => ({
      id: row.id,
      timestamp: row.created_at,
      actorName: row.actor_name || 'Hệ thống',
      actorRole: row.actor_role,
      action: row.action,
      target: `${row.target_type || ''}:${row.target_id || ''}`,
      ipAddress: row.ip_address || ''
    }));
  }

  return { assignments, literatureTexts, rubric: primaryRubric, rubrics, portfolios, feedbacks, rubricSubmissions, auditLogs, classes, users, aiReviews };
}

async function saveDraft(user, input, _req) {
  if (user.role !== 'student') throw new Error('FORBIDDEN');
  const assignmentId = cleanTrimmed(input.assignmentId, 200);
  const content = normalizeDraft(input.content);
  const suppliedRevision = Number(input.draftRevision);
  const hasSuppliedRevision = Number.isInteger(suppliedRevision) && suppliedRevision >= 0;
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const portfolio = await portfolioForStudent(client, assignmentId, user.id, true);
    if (!portfolio) throw new Error('PORTFOLIO_NOT_FOUND');
    if (portfolio.assignment_status !== 'published') throw new Error('ASSIGNMENT_CLOSED');
    if (['submitted_waiting_ai', 'ai_proposed_waiting_teacher', 'teacher_feedback_needed', 'waiting_official_rubric', 'completed'].includes(portfolio.status)) throw new Error('PORTFOLIO_READ_ONLY');
    const revision = await client.query("SELECT 1 FROM portfolio_versions WHERE portfolio_id=$1 AND stage='revision' LIMIT 1", [portfolio.id]);
    if (revision.rows.length) throw new Error('PORTFOLIO_READ_ONLY');

    const draftResult = await client.query(
      'SELECT draft_revision FROM portfolio_drafts WHERE portfolio_id=$1 FOR UPDATE',
      [portfolio.id]
    );
    const currentRevision = Number(draftResult.rows[0]?.draft_revision || 0);
    if (hasSuppliedRevision && suppliedRevision !== currentRevision) throw new Error('DRAFT_CONFLICT');

    const saved = draftResult.rows.length
      ? await client.query(`
          UPDATE portfolio_drafts
          SET content_json=$2, updated_by=$3, updated_at=now(), draft_revision=draft_revision+1
          WHERE portfolio_id=$1
          RETURNING draft_revision, updated_at
        `, [portfolio.id, content, user.id])
      : await client.query(`
          INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by,updated_at,draft_revision)
          VALUES($1,$2,$3,now(),1)
          RETURNING draft_revision, updated_at
        `, [portfolio.id, content, user.id]);

    await client.query('UPDATE portfolios SET updated_at=now() WHERE id=$1', [portfolio.id]);
    await client.query('COMMIT');
    return {
      ok: true,
      savedAt: saved.rows[0]?.updated_at || new Date().toISOString(),
      draftRevision: Number(saved.rows[0]?.draft_revision || currentRevision + 1)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function createVersion(user, input, req) {
  if (user.role !== 'student') throw new Error('FORBIDDEN');
  const assignmentId = cleanTrimmed(input.assignmentId, 200);
  const submissionKey = cleanTrimmed(input.submissionKey, 80);
  if (!isUuid(submissionKey)) throw new Error('SUBMISSION_KEY_REQUIRED');
  const requestedStage = cleanTrimmed(input.stage, 20);
  if (requestedStage && !ALLOWED_STAGES.has(requestedStage)) throw new Error('INVALID_STAGE');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const portfolio = await portfolioForStudent(client, assignmentId, user.id, true);
    if (!portfolio) throw new Error('PORTFOLIO_NOT_FOUND');
    const existing = await client.query(`SELECT * FROM portfolio_versions WHERE portfolio_id=$1 AND submission_key=$2 LIMIT 1`, [portfolio.id, submissionKey]);
    if (existing.rows[0]) {
      const draft = await client.query('SELECT draft_revision FROM portfolio_drafts WHERE portfolio_id=$1', [portfolio.id]);
      await client.query('COMMIT');
      const row = existing.rows[0];
      return { ok: true, isIdempotentRetry: true, version: {
        id: row.id, versionNumber: row.version_number, sequenceNo: row.sequence_no, stage: row.stage,
        createdAt: row.submitted_at, contentChecksum: row.content_checksum, responses: normalizeDraft(row.content_json)
      }, portfolioStatus: portfolio.status, draftRevision: Number(draft.rows[0]?.draft_revision || 0) };
    }
    if (portfolio.assignment_status !== 'published') throw new Error('ASSIGNMENT_CLOSED');
    if (['waiting_official_rubric', 'completed'].includes(portfolio.status)) throw new Error('PORTFOLIO_READ_ONLY');

    const draftState = await client.query('SELECT draft_revision,content_json FROM portfolio_drafts WHERE portfolio_id=$1 FOR UPDATE', [portfolio.id]);
    const currentDraftRevision = Number(draftState.rows[0]?.draft_revision || 0);
    if (input.draftRevision !== undefined && Number(input.draftRevision) !== currentDraftRevision) {
      const matchesSavedContent = input.content && typeof input.content === 'object'
        && checksumContent(normalizeDraft(input.content)) === checksumContent(normalizeDraft(draftState.rows[0]?.content_json || emptyDraft()));
      if (!matchesSavedContent) throw new Error('DRAFT_CONFLICT');
    }
    let savedDraftRevision = currentDraftRevision;

    let content;
    if (input.content && typeof input.content === 'object') {
      content = normalizeDraft(input.content);
      const savedDraft = await client.query(`
        INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by,updated_at,draft_revision)
        VALUES($1,$2,$3,now(),1) ON CONFLICT(portfolio_id)
        DO UPDATE SET content_json=EXCLUDED.content_json,updated_by=EXCLUDED.updated_by,updated_at=now(),draft_revision=portfolio_drafts.draft_revision+1
        RETURNING draft_revision
      `, [portfolio.id, content, user.id]);
      savedDraftRevision = Number(savedDraft.rows[0].draft_revision);
    } else {
      const draft = await client.query('SELECT content_json FROM portfolio_drafts WHERE portfolio_id=$1', [portfolio.id]);
      content = normalizeDraft(draft.rows[0]?.content_json || emptyDraft());
    }

    const previous = await client.query(`
      SELECT id,sequence_no,stage FROM portfolio_versions WHERE portfolio_id=$1
      ORDER BY sequence_no DESC NULLS LAST,submitted_at DESC,id DESC LIMIT 1
    `, [portfolio.id]);
    const prev = previous.rows[0] || null;
    const nextSeq = prev ? Number(prev.sequence_no || 0) + 1 : 1;
    const counts = await client.query(`
      SELECT count(*) FILTER(WHERE stage='prediction')::int prediction_count,
             count(*) FILTER(WHERE stage<>'prediction')::int submission_count
      FROM portfolio_versions WHERE portfolio_id=$1
    `, [portfolio.id]);
    const predictionCount = Number(counts.rows[0]?.prediction_count || 0);
    const submissionCount = Number(counts.rows[0]?.submission_count || 0);
    const isPrediction = requestedStage === 'prediction';
    if (isPrediction && predictionCount > 0) throw new Error('PREDICTION_ALREADY_SUBMITTED');
    if (isPrediction && submissionCount > 0) throw new Error('PREDICTION_WINDOW_CLOSED');
    if (requestedStage === 'initial' && submissionCount > 0) throw new Error('INITIAL_ALREADY_SUBMITTED');
    if (requestedStage === 'revision' && submissionCount === 0) throw new Error('INITIAL_VERSION_REQUIRED');
    const stage = isPrediction ? 'prediction' : (submissionCount === 0 ? 'initial' : 'revision');
    if (stage === 'initial' && Boolean(portfolio.workflow_config?.predictionEnabled) && predictionCount === 0) throw new Error('PREDICTION_REQUIRED_FIRST');
    if (stage === 'revision') {
      if (['submitted_waiting_ai', 'ai_proposed_waiting_teacher', 'teacher_feedback_needed'].includes(portfolio.status)) throw new Error('PORTFOLIO_READ_ONLY');
      const revisionCount = await client.query("SELECT 1 FROM portfolio_versions WHERE portfolio_id=$1 AND stage='revision' LIMIT 1", [portfolio.id]);
      if (revisionCount.rows.length) throw new Error('REVISION_ALREADY_SUBMITTED');
      const feedback = await client.query('SELECT 1 FROM feedbacks WHERE portfolio_id=$1 AND version_id=$2 LIMIT 1', [portfolio.id, prev?.id]);
      if (!feedback.rows.length) throw new Error('FEEDBACK_REQUIRED_BEFORE_REVISION');
    }
    const versionNumber = isPrediction ? 'V0' : `V${submissionCount + 1}`;
    const revisionReason = cleanTrimmed(input.revisionReason, 5000);
    if (stage === 'revision' && !revisionReason) throw new Error('REVISION_REASON_REQUIRED');
    const confidence = input.confidence === undefined || input.confidence === null ? null : Number(input.confidence);
    if (confidence !== null && (!Number.isInteger(confidence) || confidence < 1 || confidence > 5)) throw new Error('INVALID_CONFIDENCE');
    const changeSource = cleanTrimmed(input.changeSource || (stage === 'prediction' ? 'initial_prediction' : stage === 'initial' ? 'initial_response' : 'self'), 50);
    const changeSummary = cleanTrimmed(input.changeSummary || revisionReason, 5000);
    const checksum = checksumContent(content);

    const inserted = await client.query(`
      INSERT INTO portfolio_versions(
        portfolio_id,version_number,content_json,change_summary,created_by,word_count,sequence_no,stage,
        confidence,change_source,revision_reason,previous_version_id,content_checksum,submission_key
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id,version_number,sequence_no,stage,submitted_at,content_checksum
    `, [portfolio.id, versionNumber, content, changeSummary, user.id, wordCount(content), nextSeq, stage,
        confidence, changeSource, revisionReason, prev?.id || null, checksum, submissionKey]);
    const version = inserted.rows[0];

    const linkedIds = Array.isArray(input.linkedFeedbackIds) ? input.linkedFeedbackIds.map(String).filter(isUuid).slice(0, 100) : [];
    if (linkedIds.length) {
      const linked = await client.query(`
        INSERT INTO version_feedback_links(version_id,feedback_id,relation)
        SELECT $1,f.id,'prompted_revision' FROM feedbacks f
        WHERE f.id=ANY($2::uuid[]) AND f.portfolio_id=$3
        ON CONFLICT(version_id,feedback_id) DO NOTHING RETURNING feedback_id
      `, [version.id, linkedIds, portfolio.id]);
      const valid = linked.rows.map(r => r.feedback_id);
      if (valid.length) {
        await client.query(`UPDATE feedbacks SET resolved=true,resolved_at=now(),resolved_by_version_id=$1 WHERE id=ANY($2::uuid[]) AND portfolio_id=$3`, [version.id, valid, portfolio.id]);
      }
    }

    const configuredAiStages = Array.isArray(portfolio.workflow_config?.aiReviewStages)
      ? portfolio.workflow_config.aiReviewStages.map(String).filter(item => ALLOWED_STAGES.has(item))
      : ['initial'];
    const aiReviewRequired = portfolio.workflow_config?.aiReviewRequired !== false;
    const shouldQueueAiReview = aiReviewRequired && configuredAiStages.includes(stage);
    if (shouldQueueAiReview) {
      const aiPrompt = stage === 'initial'
        ? 'Tạo phản hồi cho V1 bất biến này theo rubric và các trục được giao. Nêu điểm mạnh, điểm cần cải thiện và bước chỉnh sửa tiếp theo. Phản hồi được gửi cho học sinh; giáo viên xem lịch sử và bổ sung khi cần.'
        : 'Tạo phản hồi AI cho đúng phiên bản bất biến này theo cấu hình nhiệm vụ. Không quyết định điểm chính thức; giáo viên vẫn chịu trách nhiệm Rubric cuối.';
      await client.query(`
        INSERT INTO ai_review_requests(portfolio_id,version_id,prompt,stage)
        VALUES($1,$2,$3,$4) ON CONFLICT(version_id) DO NOTHING
      `, [portfolio.id, version.id, aiPrompt, stage]);
    }

    const nextPortfolioStatus = shouldQueueAiReview
      ? 'submitted_waiting_ai'
      : stage === 'prediction'
        ? 'drafting'
        : stage === 'initial'
          ? 'teacher_feedback_needed'
          : 'feedback_received';
    await client.query(
      'UPDATE portfolios SET active_version=$2,status=$3,updated_at=now() WHERE id=$1',
      [portfolio.id, versionNumber, nextPortfolioStatus]
    );
    await audit(client, user, 'STUDENT_SUBMIT_VERSION', 'portfolio', portfolio.id, {
      versionId: version.id, versionNumber, sequenceNo: nextSeq, stage, contentChecksum: checksum,
      aiReviewQueued: shouldQueueAiReview, portfolioStatus: nextPortfolioStatus
    }, req);
    await client.query('COMMIT');
    return { ok: true, version: {
      id: version.id, versionNumber: version.version_number, sequenceNo: version.sequence_no,
      stage: version.stage, createdAt: version.submitted_at, contentChecksum: version.content_checksum, responses: content
    }, portfolioStatus: nextPortfolioStatus, aiReviewQueued: shouldQueueAiReview, draftRevision: savedDraftRevision };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function aiCompleteReview(user, input, req) {
  if (user.role !== 'ai') throw new Error('FORBIDDEN');
  const reviewId = cleanTrimmed(input.reviewId, 80);
  if (!isUuid(reviewId)) throw new Error('AI_REVIEW_NOT_FOUND');
  const response = cleanTrimmed(input.response, 100000);
  if (!response) throw new Error('EMPTY_RESPONSE');
  const axisId = cleanTrimmed(input.axisId || 'form_argument', 50);
  if (!AXES.includes(axisId)) throw new Error('INVALID_AXIS');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT ar.*,p.id portfolio_id FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id WHERE ar.id=$1 FOR UPDATE OF ar
    `, [reviewId]);
    const row = result.rows[0];
    if (!row) throw new Error('AI_REVIEW_NOT_FOUND');
    if (row.reviewer_id && row.reviewer_id !== user.id) throw new Error('AI_REVIEW_CLAIMED');
    if (row.status === 'completed') {
      await client.query('COMMIT');
      return { ok: true, isIdempotentRetry: true };
    }
    if (!['pending','in_progress'].includes(row.status)) throw new Error('AI_REVIEW_CLOSED');
    const proposal = input.rubricProposal && typeof input.rubricProposal === 'object' ? input.rubricProposal : null;
    await client.query(`
      UPDATE ai_review_requests SET status='completed',response=$2,rubric_proposal_json=$3,
             reviewer_id=$4,completed_at=now(),teacher_review_status='pending'
      WHERE id=$1
    `, [reviewId, response, proposal ? JSON.stringify(proposal) : null, user.id]);
    const feedback = await client.query(`
      INSERT INTO feedbacks(portfolio_id,version_id,axis_id,selected_snippet,comment,author_id,author_role)
      VALUES($1,$2,$3,$4,$5,$6,'ai')
      RETURNING id
    `, [row.portfolio_id, row.version_id, axisId, cleanText(input.selectedSnippet, 5000), response, user.id]);
    const portfolioStatus = await markPortfolioFeedbackReceived(client, row.portfolio_id);
    await audit(client, user, 'AI_PUBLISH_FEEDBACK', 'ai_review', reviewId, { feedbackId: feedback.rows[0].id, visibleToStudent: true }, req);
    await client.query('COMMIT');
    return { ok: true, feedbackId: feedback.rows[0].id, visibleToStudent: true, portfolioStatus };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function teacherReviewAi(user, input, req) {
  if (user.role !== 'teacher') throw new Error('FORBIDDEN');
  const reviewId = cleanTrimmed(input.reviewId, 80);
  if (!isUuid(reviewId)) throw new Error('AI_REVIEW_NOT_FOUND');
  const decision = cleanTrimmed(input.decision || input.status, 20);
  if (!ALLOWED_DECISIONS.has(decision)) throw new Error('INVALID_STATUS');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT ar.*,p.student_id,p.id portfolio_id,a.class_id,a.public_id assignment_public_id,v.version_number
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=ar.version_id
      WHERE ar.id=$1 FOR UPDATE OF ar
    `, [reviewId]);
    const row = result.rows[0];
    if (!row) throw new Error('AI_REVIEW_NOT_FOUND');
    if (row.status !== 'completed') throw new Error('AI_REVIEW_NOT_COMPLETED');
    if (!(await teacherCanAccessClass(client, row.class_id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');
    if (row.teacher_review_status !== 'pending') {
      const existing = await client.query('SELECT id FROM feedbacks WHERE source_ai_review_id=$1 LIMIT 1', [reviewId]);
      await client.query('COMMIT');
      return { ok: true, isIdempotentRetry: true, decision: row.teacher_review_status, feedbackId: existing.rows[0]?.id || null };
    }
    let finalResponse = '';
    if (decision === 'approved') finalResponse = '';
    if (decision === 'revised') {
      finalResponse = cleanTrimmed(input.finalResponse, 100000);
      if (!finalResponse) throw new Error('REVISED_RESPONSE_REQUIRED');
    }
    const axisId = cleanTrimmed(input.axisId || 'form_argument', 50);
    if (!AXES.includes(axisId)) throw new Error('INVALID_AXIS');
    const teacherNote = cleanTrimmed(input.teacherNote || input.note, 10000);
    await client.query(`
      UPDATE ai_review_requests SET teacher_review_status=$2,final_response=$3,teacher_id=$4,
             teacher_reviewed_at=now(),teacher_note=$5 WHERE id=$1
    `, [reviewId, decision, finalResponse, user.id, teacherNote]);
    let feedbackId = null;
    if (decision === 'revised' && finalResponse) {
      const inserted = await client.query(`
        INSERT INTO feedbacks(portfolio_id,version_id,axis_id,selected_snippet,comment,author_id,author_role,source_ai_review_id)
        VALUES($1,$2,$3,$4,$5,$6,'teacher',$7)
        ON CONFLICT(source_ai_review_id) WHERE source_ai_review_id IS NOT NULL DO NOTHING
        RETURNING id
      `, [row.portfolio_id, row.version_id, axisId, cleanText(input.selectedSnippet, 5000), finalResponse, user.id, reviewId]);
      feedbackId = inserted.rows[0]?.id || null;
      if (!feedbackId) {
        const existing = await client.query('SELECT id FROM feedbacks WHERE source_ai_review_id=$1 LIMIT 1', [reviewId]);
        feedbackId = existing.rows[0]?.id || null;
      }
    }
    const portfolioStatus = await markPortfolioFeedbackReceived(client, row.portfolio_id);
    await audit(client, user, 'TEACHER_FINALIZE_AI_REVIEW', 'ai_review', reviewId, { decision, feedbackId, hasFinalResponse: Boolean(finalResponse) }, req);
    await client.query('COMMIT');
    return { ok: true, decision, feedbackId, portfolioStatus };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function addFeedback(user, input, req) {
  if (!['teacher','peer'].includes(user.role)) throw new Error('FORBIDDEN');
  const versionId = cleanTrimmed(input.versionId, 80);
  if (!isUuid(versionId)) throw new Error('VERSION_REQUIRED');
  const axisId = cleanTrimmed(input.axisId, 50);
  if (!AXES.includes(axisId)) throw new Error('INVALID_AXIS');
  const comment = cleanTrimmed(input.comment, 20000);
  if (!comment) throw new Error('COMMENT_REQUIRED');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let portfolio;
    let peerAssignmentId = null;
    if (user.role === 'peer') {
      const scope = await exactPeerScope(client, user.id, versionId);
      if (!scope) throw new Error('PEER_ASSIGNMENT_FORBIDDEN');
      portfolio = { id: scope.portfolio_id, student_id: scope.student_id, assignment_db_id: scope.assignment_db_id, class_id: scope.class_id };
      peerAssignmentId = scope.peer_assignment_id;
    } else {
      const studentId = cleanTrimmed(input.studentId, 80);
      if (!isUuid(studentId)) throw new Error('STUDENT_REQUIRED');
      portfolio = await portfolioForStudent(client, cleanTrimmed(input.assignmentId, 200), studentId, true);
      if (!portfolio) throw new Error('PORTFOLIO_NOT_FOUND');
      if (user.role === 'teacher' && !(await teacherCanAccessClass(client, portfolio.class_id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');
      const exact = await client.query('SELECT 1 FROM portfolio_versions WHERE id=$1 AND portfolio_id=$2 LIMIT 1', [versionId, portfolio.id]);
      if (!exact.rows.length) throw new Error('VERSION_NOT_FOUND');
    }
    const authorRole = user.role;
    const rawAnchor = input.anchor && typeof input.anchor === 'object' && !Array.isArray(input.anchor) ? input.anchor : null;
    const start = Number(rawAnchor?.start);
    const end = Number(rawAnchor?.end);
    const anchor = rawAnchor && rawAnchor.type === 'text-range' && Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start
      ? {
          type: 'text-range',
          axisId,
          start,
          end,
          exact: cleanText(rawAnchor.exact || input.selectedSnippet, 5000),
          prefix: cleanText(rawAnchor.prefix, 240),
          suffix: cleanText(rawAnchor.suffix, 240)
        }
      : { type: 'axis', axisId };
    const inserted = await client.query(`
      INSERT INTO feedbacks(portfolio_id,version_id,axis_id,selected_snippet,comment,author_id,author_role,anchor_json)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id,created_at
    `, [portfolio.id, versionId, axisId, cleanText(input.selectedSnippet, 5000), comment, user.id, authorRole, JSON.stringify(anchor)]);
    await markPortfolioFeedbackReceived(client, portfolio.id);
    if (peerAssignmentId) await client.query(`UPDATE peer_review_assignments SET status='completed',completed_at=now() WHERE id=$1`, [peerAssignmentId]);
    await audit(client, user, 'ADD_FEEDBACK', 'portfolio', portfolio.id, { feedbackId: inserted.rows[0].id, versionId, axisId }, req);
    await client.query('COMMIT');
    return { ok: true, id: inserted.rows[0].id, createdAt: inserted.rows[0].created_at };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function resolveFeedback(user, input, req) {
  if (user.role !== 'student') throw new Error('FORBIDDEN');
  const feedbackId = cleanTrimmed(input.feedbackId, 80);
  if (!isUuid(feedbackId)) throw new Error('FEEDBACK_NOT_FOUND');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT f.id,f.portfolio_id,p.student_id FROM feedbacks f JOIN portfolios p ON p.id=f.portfolio_id
      WHERE f.id=$1 FOR UPDATE OF f
    `, [feedbackId]);
    const row = result.rows[0];
    if (!row) throw new Error('FEEDBACK_NOT_FOUND');
    if (row.student_id !== user.id) throw new Error('FORBIDDEN');
    await client.query(`UPDATE feedbacks SET resolved=true,resolved_at=COALESCE(resolved_at,now()) WHERE id=$1`, [feedbackId]);
    await audit(client, user, 'RESOLVE_FEEDBACK', 'feedback', feedbackId, { resolved: true }, req);
    await client.query('COMMIT');
    return { ok: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function normalizeCriterionInput(value) {
  if (value && typeof value === 'object') return { level: Number(value.level ?? value.score ?? 0), note: cleanText(value.note, 5000) };
  return { level: Number(value || 0), note: '' };
}

async function submitRubric(user, input, req) {
  if (!['student','teacher','peer'].includes(user.role)) throw new Error('FORBIDDEN');
  const versionId = cleanTrimmed(input.versionId, 80);
  if (!isUuid(versionId)) throw new Error('VERSION_REQUIRED');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let portfolio;
    let peerAssignmentId = null;
    if (user.role === 'peer') {
      const scope = await exactPeerScope(client, user.id, versionId);
      if (!scope) throw new Error('PEER_ASSIGNMENT_FORBIDDEN');
      portfolio = { id: scope.portfolio_id, student_id: scope.student_id, assignment_db_id: scope.assignment_db_id, class_id: scope.class_id };
      peerAssignmentId = scope.peer_assignment_id;
    } else {
      const targetStudentId = user.role === 'student' ? user.id : cleanTrimmed(input.studentId, 80);
      if (!isUuid(targetStudentId)) throw new Error('STUDENT_REQUIRED');
      portfolio = await portfolioForStudent(client, cleanTrimmed(input.assignmentId, 200), targetStudentId, true);
      if (!portfolio) throw new Error('PORTFOLIO_NOT_FOUND');
      if (user.role === 'teacher' && !(await teacherCanAccessClass(client, portfolio.class_id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');
      const exact = await client.query('SELECT 1 FROM portfolio_versions WHERE id=$1 AND portfolio_id=$2 LIMIT 1', [versionId, portfolio.id]);
      if (!exact.rows.length) throw new Error('VERSION_NOT_FOUND');
    }
    if (user.role === 'teacher') {
      const reflection = await client.query(
        'SELECT 1 FROM student_reflections WHERE portfolio_id=$1 AND version_id=$2 LIMIT 1',
        [portfolio.id, versionId]
      );
      if (!reflection.rows.length) throw new Error('REFLECTION_REQUIRED_BEFORE_OFFICIAL_RUBRIC');
    }
    const criteriaResult = await client.query(`
      SELECT rc.public_id,rc.weight,rc.levels_json FROM assignments a
      JOIN rubric_criteria rc ON rc.rubric_id=a.rubric_id
      WHERE a.id=$1 ORDER BY rc.sort_order
    `, [portfolio.assignment_db_id]);
    if (!criteriaResult.rows.length) throw new Error('RUBRIC_NOT_FOUND');
    const incoming = input.criterionScores && typeof input.criterionScores === 'object' ? input.criterionScores : {};
    const validIds = new Set(criteriaResult.rows.map(row => row.public_id));
    if (Object.keys(incoming).some(id => !validIds.has(id))) throw new Error('INVALID_RUBRIC_CRITERION');
    const normalized = {};
    let totalScore = 0;
    let maxScore = 0;
    for (const criterion of criteriaResult.rows) {
      const levels = Array.isArray(criterion.levels_json) ? criterion.levels_json : [];
      const supplied = normalizeCriterionInput(incoming[criterion.public_id]);
      const selected = levels.find(level => Number(level.level) === supplied.level);
      if (!selected) throw new Error(`INVALID_RUBRIC_LEVEL:${criterion.public_id}`);
      const weight = Number(criterion.weight || 1);
      const score = Number(selected.score ?? selected.level ?? 0);
      const maximum = levels.reduce((max, level) => Math.max(max, Number(level.score ?? level.level ?? 0)), 0);
      totalScore += score * weight;
      maxScore += maximum * weight;
      normalized[criterion.public_id] = { level: supplied.level, score, note: supplied.note };
    }
    const evaluatorRole = user.role;
    const inserted = await client.query(`
      INSERT INTO rubric_submissions(portfolio_id,version_id,evaluator_id,evaluator_role,criterion_scores,overall_feedback,total_score,max_score)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(portfolio_id,version_id,evaluator_id,evaluator_role)
      DO UPDATE SET criterion_scores=EXCLUDED.criterion_scores,overall_feedback=EXCLUDED.overall_feedback,
                    total_score=EXCLUDED.total_score,max_score=EXCLUDED.max_score,submitted_at=now()
      RETURNING id,submitted_at
    `, [portfolio.id, versionId, user.id, evaluatorRole, normalized, cleanText(input.overallFeedback, 20000), totalScore, maxScore]);
    let portfolioStatus = null;
    if (user.role === 'teacher') {
      await client.query("UPDATE portfolios SET status='completed', updated_at=now() WHERE id=$1", [portfolio.id]);
      portfolioStatus = 'completed';
    }
    if (peerAssignmentId) await client.query(`UPDATE peer_review_assignments SET status='completed',completed_at=now() WHERE id=$1`, [peerAssignmentId]);
    await audit(client, user, 'SUBMIT_RUBRIC', 'portfolio', portfolio.id, { submissionId: inserted.rows[0].id, versionId, totalScore, maxScore, portfolioStatus }, req);
    await client.query('COMMIT');
    return { ok: true, id: inserted.rows[0].id, submittedAt: inserted.rows[0].submitted_at, totalScore, maxScore, ...(portfolioStatus ? { portfolioStatus } : {}) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function assignPeerReview(user, input, req) {
  if (!['teacher','admin'].includes(user.role)) throw new Error('FORBIDDEN');
  const assignmentPublicId = cleanTrimmed(input.assignmentId, 200);
  const reviewerId = cleanTrimmed(input.reviewerId, 80);
  const studentId = cleanTrimmed(input.studentId, 80);
  const versionId = cleanTrimmed(input.versionId, 80);
  if (![reviewerId,studentId,versionId].every(isUuid) || !assignmentPublicId) throw new Error('VALIDATION_ERROR');
  if (reviewerId === studentId) throw new Error('CANNOT_PEER_REVIEW_SELF');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assignment = await client.query('SELECT id,class_id FROM assignments WHERE public_id=$1 LIMIT 1', [assignmentPublicId]);
    const a = assignment.rows[0];
    if (!a) throw new Error('ASSIGNMENT_NOT_FOUND');
    if (user.role !== 'admin' && !(await teacherCanAccessClass(client, a.class_id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');
    const reviewer = await client.query("SELECT 1 FROM app_users WHERE id=$1 AND role='peer' AND account_status='active'", [reviewerId]);
    if (!reviewer.rows.length) throw new Error('PEER_REVIEWER_INVALID');
    const student = await client.query(`
      SELECT p.id portfolio_id FROM portfolios p
      JOIN class_members cm ON cm.class_id=$1 AND cm.user_id=p.student_id AND cm.member_role='student'
      WHERE p.assignment_id=$2 AND p.student_id=$3 LIMIT 1
    `, [a.class_id, a.id, studentId]);
    if (!student.rows[0]) throw new Error('PEER_STUDENT_INVALID');
    const version = await client.query('SELECT 1 FROM portfolio_versions WHERE id=$1 AND portfolio_id=$2 LIMIT 1', [versionId, student.rows[0].portfolio_id]);
    if (!version.rows.length) throw new Error('VERSION_NOT_FOUND');
    const result = await client.query(`
      INSERT INTO peer_review_assignments(assignment_id,reviewer_id,student_id,version_id,status,assigned_at,completed_at)
      VALUES($1,$2,$3,$4,'pending',now(),NULL)
      ON CONFLICT(assignment_id,reviewer_id,student_id)
      DO UPDATE SET version_id=EXCLUDED.version_id,status='pending',assigned_at=now(),completed_at=NULL
      RETURNING id
    `, [a.id, reviewerId, studentId, versionId]);
    await audit(client, user, 'ASSIGN_PEER_REVIEW', 'peer_review', result.rows[0].id, { reviewerId, studentId, versionId }, req);
    await client.query('COMMIT');
    return { ok: true, id: result.rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function createAssignment(user, input, req) {
  if (!['teacher','admin'].includes(user.role)) throw new Error('FORBIDDEN');
  const caps = await capabilities();
  if (!caps.textVersioning) throw new Error('SCHEMA_MIGRATION_REQUIRED');
  const classCode = cleanTrimmed(input.classId, 30).toUpperCase();
  const textVersionId = cleanTrimmed(input.textVersionId || input.textId, 80);
  const rubricPublicId = cleanTrimmed(input.rubricId, 120);
  const title = cleanTrimmed(input.title, 240);
  if (!classCode || !isUuid(textVersionId) || !rubricPublicId || !title) throw new Error('VALIDATION_ERROR');
  const targetAxes = Array.isArray(input.targetAxes) ? [...new Set(input.targetAxes.map(String))] : AXES;
  if (!targetAxes.length || targetAxes.some(axis => !AXES.includes(axis))) throw new Error('INVALID_AXIS');
  const difficulty = cleanTrimmed(input.difficulty || 'Cơ bản', 30);
  if (!ALLOWED_DIFFICULTY.has(difficulty)) throw new Error('INVALID_DIFFICULTY');
  const deadline = input.deadline ? new Date(input.deadline) : null;
  if (deadline && Number.isNaN(deadline.getTime())) throw new Error('INVALID_DEADLINE');
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const classResult = await client.query('SELECT id FROM classes WHERE code=$1 LIMIT 1', [classCode]);
    const classRow = classResult.rows[0];
    if (!classRow) throw new Error('CLASS_NOT_FOUND');
    if (user.role !== 'admin' && !(await teacherCanAccessClass(client, classRow.id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');
    const textResult = await client.query(`
      SELECT v.id,v.literature_text_id,v.version_no,
             (SELECT max(v2.version_no) FROM literature_text_versions v2 WHERE v2.literature_text_id=v.literature_text_id) latest_version
      FROM literature_text_versions v WHERE v.id=$1 LIMIT 1
    `, [textVersionId]);
    const text = textResult.rows[0];
    if (!text) throw new Error('LITERATURE_VERSION_NOT_FOUND');
    if (Number(text.version_no) !== Number(text.latest_version)) throw new Error('LITERATURE_VERSION_NOT_LATEST');
    const rubric = await client.query('SELECT id FROM rubrics WHERE public_id=$1 LIMIT 1', [rubricPublicId]);
    if (!rubric.rows[0]) throw new Error('RUBRIC_NOT_FOUND');
    const publicId = `assign-${randomUUID()}`;
    const inserted = await client.query(`
      INSERT INTO assignments(
        public_id,class_id,text_id,literature_text_version_id,rubric_id,title,assigned_at,deadline,difficulty,target_axes,
        prompt,guiding_steps,starter_template,status,ai_guidance,common_mistakes,reference_guide,prediction_template,workflow_config,created_by
      ) VALUES($1,$2,$3,$4,$5,$6,now(),$7,$8,$9,$10,$11,$12,'published',$13,$14,$15,$16,$17,$18)
      RETURNING id
    `, [publicId, classRow.id, text.literature_text_id, text.id, rubric.rows[0].id, title, deadline ? deadline.toISOString() : null,
        difficulty, targetAxes, cleanText(input.prompt, 30000), JSON.stringify(Array.isArray(input.guidingSteps) ? input.guidingSteps.slice(0, 30).map(v => cleanText(v, 1000)) : []),
        JSON.stringify(input.starterTemplate && typeof input.starterTemplate === 'object' ? input.starterTemplate : {}),
        cleanText(input.aiGuidance, 20000), cleanText(input.commonMistakes, 20000), cleanText(input.referenceGuide, 30000),
        JSON.stringify(input.predictionTemplate && typeof input.predictionTemplate === 'object' ? input.predictionTemplate : {}),
        JSON.stringify(input.workflowConfig && typeof input.workflowConfig === 'object' ? input.workflowConfig : {}), user.id]);
    const assignmentDbId = inserted.rows[0].id;
    await client.query(`
      INSERT INTO portfolios(assignment_id,student_id,active_version)
      SELECT $1,cm.user_id,'Bản nháp' FROM class_members cm
      JOIN app_users u ON u.id=cm.user_id AND u.role='student' AND u.account_status='active'
      WHERE cm.class_id=$2 AND cm.member_role='student'
      ON CONFLICT(assignment_id,student_id) DO NOTHING
    `, [assignmentDbId, classRow.id]);
    await client.query(`
      INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
      SELECT p.id,$1::jsonb,p.student_id FROM portfolios p WHERE p.assignment_id=$2
      ON CONFLICT(portfolio_id) DO NOTHING
    `, [JSON.stringify(emptyDraft()), assignmentDbId]);
    await audit(client, user, 'CREATE_ASSIGNMENT', 'assignment', publicId, { title, classCode, textVersionId, rubricId: rubricPublicId }, req);
    await client.query('COMMIT');
    return { ok: true, id: publicId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function academicAction(user, input, req) {
  assertSameOrigin(req);
  const action = cleanTrimmed(input?.action, 80);
  if (action === 'save_draft') return saveDraft(user, input, req);
  if (action === 'create_version') return createVersion(user, input, req);
  if (action === 'ai_complete_review') return aiCompleteReview(user, input, req);
  if (action === 'teacher_review_ai') return teacherReviewAi(user, input, req);
  if (action === 'add_feedback') return addFeedback(user, input, req);
  if (action === 'resolve_feedback') return resolveFeedback(user, input, req);
  if (action === 'submit_rubric') return submitRubric(user, input, req);
  if (action === 'assign_peer_review') return assignPeerReview(user, input, req);
  if (action === 'create_assignment') return createAssignment(user, input, req);
  throw new Error('UNKNOWN_ACTION');
}

export async function saveLiteratureRevision(user, input, req) {
  if (!['teacher','admin'].includes(user.role)) throw new Error('FORBIDDEN');
  assertSameOrigin(req);
  const caps = await capabilities();
  if (!caps.textVersioning) throw new Error('SCHEMA_MIGRATION_REQUIRED');
  const title = cleanTrimmed(input.title, 240);
  const author = cleanTrimmed(input.author, 160);
  if (!title || !author) throw new Error('VALIDATION_ERROR');
  const logicalPublicId = cleanTrimmed(input.logicalId || input.publicId || input.id, 120);
  const snapshot = {
    title,
    author,
    year: cleanText(input.year, 80),
    genre: cleanText(input.genre, 120),
    synopsis: cleanText(input.synopsis, 30000),
    excerpt: cleanText(input.excerpt, 100000),
    fullContent: cleanText(input.fullContent ?? input.excerpt, 400000),
    historicalContext: cleanText(input.historicalContext, 30000),
    tags: cleanStringArray(input.tags, 30, 100)
  };
  const checksum = checksumContent(snapshot);
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let logical;
    if (logicalPublicId) {
      const found = await client.query('SELECT * FROM literature_texts WHERE public_id=$1 FOR UPDATE', [logicalPublicId]);
      logical = found.rows[0] || null;
      if (!logical) throw new Error('LITERATURE_TEXT_NOT_FOUND');
    } else {
      const baseSlug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'text';
      const publicId = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      const inserted = await client.query(`
        INSERT INTO literature_texts(public_id,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [publicId,title,author,snapshot.year,snapshot.genre,snapshot.synopsis,snapshot.excerpt,snapshot.fullContent,snapshot.historicalContext,snapshot.tags,user.id]);
      logical = inserted.rows[0];
    }
    const latest = await client.query(`
      SELECT * FROM literature_text_versions WHERE literature_text_id=$1 ORDER BY version_no DESC LIMIT 1
    `, [logical.id]);
    if (latest.rows[0]?.content_checksum === checksum) {
      await client.query('COMMIT');
      return { ok: true, id: logical.public_id, versionId: latest.rows[0].id, revisionNo: latest.rows[0].version_no, isIdempotentRetry: true };
    }
    const revisionNo = Number(latest.rows[0]?.version_no || 0) + 1;
    const version = await client.query(`
      INSERT INTO literature_text_versions(
        literature_text_id,version_no,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags,content_checksum,created_by
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id,version_no
    `, [logical.id,revisionNo,title,author,snapshot.year,snapshot.genre,snapshot.synopsis,snapshot.excerpt,snapshot.fullContent,snapshot.historicalContext,snapshot.tags,checksum,user.id]);
    await client.query(`
      UPDATE literature_texts SET title=$2,author=$3,year_text=$4,genre=$5,synopsis=$6,excerpt=$7,full_content=$8,
             historical_context=$9,tags=$10,updated_at=now() WHERE id=$1
    `, [logical.id,title,author,snapshot.year,snapshot.genre,snapshot.synopsis,snapshot.excerpt,snapshot.fullContent,snapshot.historicalContext,snapshot.tags]);
    await audit(client, user, 'CREATE_LITERATURE_REVISION', 'literature', logical.public_id, { versionId: version.rows[0].id, revisionNo, checksum }, req);
    await client.query('COMMIT');
    capabilitiesPromise = null;
    return { ok: true, id: logical.public_id, versionId: version.rows[0].id, revisionNo };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function createRubricVersion(user, input, req) {
  if (!['teacher','admin'].includes(user.role)) throw new Error('FORBIDDEN');
  assertSameOrigin(req);
  const title = cleanTrimmed(input.title, 240);
  const criteria = Array.isArray(input.criteria) ? input.criteria : [];
  if (!title || criteria.length !== AXES.length) throw new Error('VALIDATION_ERROR');
  const seen = new Set();
  for (const criterion of criteria) {
    const axis = cleanTrimmed(criterion.axisId || criterion.id, 50);
    if (!AXES.includes(axis) || seen.has(axis)) throw new Error('INVALID_AXIS_CRITERIA');
    seen.add(axis);
    const levels = Array.isArray(criterion.levels) ? criterion.levels : [];
    if (!levels.length || levels.some(level => ![1,2,3,4].includes(Number(level.level)))) throw new Error('INVALID_RUBRIC_LEVEL');
  }
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const publicId = `rubric-${randomUUID()}`;
    await client.query('UPDATE rubrics SET is_active=false,updated_at=now() WHERE is_active=true');
    const rubric = await client.query(`INSERT INTO rubrics(public_id,title,description,created_by,is_active) VALUES($1,$2,$3,$4,true) RETURNING id`, [publicId,title,cleanText(input.description,5000),user.id]);
    for (let i=0;i<criteria.length;i++) {
      const criterion = criteria[i];
      const axis = cleanTrimmed(criterion.axisId || criterion.id,50);
      const levels = criterion.levels.map(level => ({
        level: Number(level.level),
        label: cleanText(level.label,100),
        score: Number(level.score ?? level.level),
        description: cleanText(level.description,5000),
        observableIndicators: cleanStringArray(level.observableIndicators,30,500)
      }));
      if (levels.some(level => !Number.isFinite(level.score))) throw new Error('INVALID_RUBRIC_SCORE');
      await client.query(`
        INSERT INTO rubric_criteria(rubric_id,public_id,axis_id,title,weight,levels_json,sort_order)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [rubric.rows[0].id,cleanTrimmed(criterion.publicId || `criterion-${axis}`,120),axis,cleanTrimmed(criterion.title || axis,240),Number(criterion.weight || 1),JSON.stringify(levels),i+1]);
    }
    await audit(client,user,'CREATE_RUBRIC_VERSION','rubric',publicId,{title},req);
    await client.query('COMMIT');
    return { ok:true,id:publicId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function academicHealth() {
  const pool = await getPool();
  const started = Date.now();
  const result = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM assignments) assignments,
      (SELECT count(*)::int FROM portfolios) portfolios,
      (SELECT count(*)::int FROM portfolio_versions) versions,
      (SELECT count(*)::int FROM portfolio_versions WHERE change_source IS DISTINCT FROM 'simulation') real_versions,
      (SELECT count(*)::int FROM portfolio_versions WHERE change_source='simulation') simulation_versions,
      (SELECT count(*)::int FROM ai_review_requests) ai_reviews,
      (SELECT count(*)::int
         FROM ai_review_requests ar
         JOIN portfolio_versions v ON v.id=ar.version_id
        WHERE v.change_source IS DISTINCT FROM 'simulation') real_ai_reviews,
      (SELECT count(*)::int
         FROM ai_review_requests ar
         JOIN portfolio_versions v ON v.id=ar.version_id
        WHERE v.change_source='simulation') simulation_ai_reviews,
      (SELECT count(*)::int
         FROM ai_review_requests ar
         JOIN portfolio_versions v ON v.id=ar.version_id
        WHERE v.change_source IS DISTINCT FROM 'simulation'
          AND ar.status IN ('pending','in_progress')) active_ai_reviews
  `);
  return { ...result.rows[0], dbRoundTripMs: Date.now() - started, textVersioning: (await capabilities()).textVersioning };
}
