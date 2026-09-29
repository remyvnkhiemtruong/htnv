import { getPool } from './db.js';
import {
  AXES,
  academicAction as academicActionV3,
  assertSameOrigin,
  getAcademicSnapshot as getAcademicSnapshotV3
} from './academic-v3.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_DECISIONS = new Set(['approved', 'revised', 'rejected']);

const cleanText = (value, max = 10000) => String(value ?? '').slice(0, max);
const cleanTrimmed = (value, max = 10000) => cleanText(value, max).trim();
const isUuid = value => UUID_RE.test(String(value || ''));
const clientIp = req => String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 100);

async function audit(client, user, action, targetType, targetId, afterJson = null, req = null) {
  await client.query(`
    INSERT INTO audit_logs(actor_id, actor_role, action, target_type, target_id, after_json, ip_address)
    VALUES($1,$2,$3,$4,$5,$6,$7)
  `, [user?.id || null, user?.role || 'system', action, cleanTrimmed(targetType, 80), cleanTrimmed(targetId, 200), afterJson ? JSON.stringify(afterJson) : null, req ? clientIp(req) : '']);
}

async function teacherCanAccessClass(client, classId, teacherId) {
  const result = await client.query(`
    SELECT 1 FROM class_members
    WHERE class_id=$1 AND user_id=$2 AND member_role='teacher'
    LIMIT 1
  `, [classId, teacherId]);
  return result.rows.length > 0;
}

async function updateAiPromptAfterVersion(result) {
  if (!result?.version?.id || !isUuid(result.version.id)) return result;
  const stage = result.version.stage;
  const prompt = stage === 'prediction'
    ? 'Tạo góp ý AI hỗ trợ cho bản dự đoán V0. Không chấm đúng/sai tuyệt đối và không tiết lộ kiến thức sau đọc. Tài khoản AI là nơi người vận hành dán response từ ChatGPT; sau khi gửi, học sinh được xem góp ý để tiếp tục học.'
    : 'Tạo góp ý AI cho đúng phiên bản bất biến này. Đối chiếu bài học sinh với câu hỏi, gợi ý chuyên môn, lỗi thường gặp và rubric do giáo viên cung cấp. Nêu điểm đạt, điểm cần bổ sung và câu hỏi gợi mở. Sau khi người vận hành dán response và gửi, học sinh được xem ngay để chỉnh sửa. AI không quyết định điểm chính thức; giáo viên vẫn xem lịch sử và quyết định rubric cuối.';
  const pool = await getPool();
  await pool.query('UPDATE ai_review_requests SET prompt=$2 WHERE version_id=$1', [result.version.id, prompt]);
  return result;
}

async function getStudentWorkflowRow(pool, userId, assignmentId) {
  const state = await pool.query(`
    SELECT p.id portfolio_id, p.status portfolio_status, a.workflow_config, a.status assignment_status,
           count(v.id) FILTER (WHERE v.stage='prediction')::int prediction_count,
           count(v.id) FILTER (WHERE v.stage<>'prediction')::int submission_count,
           count(v.id) FILTER (WHERE v.stage='revision')::int revision_count
    FROM portfolios p
    JOIN assignments a ON a.id=p.assignment_id
    LEFT JOIN portfolio_versions v ON v.portfolio_id=p.id
    WHERE p.student_id=$1 AND a.public_id=$2
    GROUP BY p.id,p.status,a.workflow_config,a.status
    LIMIT 1
  `, [userId, assignmentId]);
  return state.rows[0] || null;
}

async function saveDraftWithWorkflow(user, input, req) {
  if (user.role !== 'student') return academicActionV3(user, input, req);
  const assignmentId = cleanTrimmed(input.assignmentId, 200);
  const pool = await getPool();
  const row = await getStudentWorkflowRow(pool, user.id, assignmentId);
  if (!row) throw new Error('PORTFOLIO_NOT_FOUND');
  if (row.assignment_status !== 'published') throw new Error('ASSIGNMENT_CLOSED');

  const revisionCount = Number(row.revision_count || 0);
  if (['submitted_waiting_ai', 'ai_proposed_waiting_teacher', 'teacher_feedback_needed', 'waiting_official_rubric', 'completed'].includes(row.portfolio_status)) {
    throw new Error('PORTFOLIO_READ_ONLY');
  }
  if (revisionCount > 0 && row.portfolio_status === 'feedback_received') throw new Error('PORTFOLIO_READ_ONLY');
  return academicActionV3(user, input, req);
}

async function createVersionWithWorkflow(user, input, req) {
  if (user.role !== 'student') return academicActionV3(user, input, req);
  const assignmentId = cleanTrimmed(input.assignmentId, 200);
  const requestedStage = cleanTrimmed(input.stage, 20);
  const pool = await getPool();
  const row = await getStudentWorkflowRow(pool, user.id, assignmentId);
  if (!row) throw new Error('PORTFOLIO_NOT_FOUND');
  if (row.assignment_status !== 'published') throw new Error('ASSIGNMENT_CLOSED');
  if (['waiting_official_rubric', 'completed'].includes(row.portfolio_status)) throw new Error('PORTFOLIO_READ_ONLY');

  const predictionEnabled = Boolean(row.workflow_config?.predictionEnabled);
  const predictionCount = Number(row.prediction_count || 0);
  const submissionCount = Number(row.submission_count || 0);
  const revisionCount = Number(row.revision_count || 0);

  if (requestedStage === 'prediction') {
    if (predictionCount > 0) throw new Error('PREDICTION_ALREADY_SUBMITTED');
    if (submissionCount > 0) throw new Error('PREDICTION_WINDOW_CLOSED');
  }
  if (requestedStage === 'initial') {
    if (submissionCount > 0) throw new Error('INITIAL_ALREADY_SUBMITTED');
    if (predictionEnabled && predictionCount === 0) throw new Error('PREDICTION_REQUIRED_FIRST');
  }
  if (requestedStage === 'revision') {
    if (revisionCount > 0) throw new Error('REVISION_ALREADY_SUBMITTED');
    if (submissionCount === 0) throw new Error('INITIAL_VERSION_REQUIRED');
    const previous = await pool.query(`
      SELECT v.id
      FROM portfolio_versions v
      WHERE v.portfolio_id=$1 AND v.stage<>'prediction'
      ORDER BY v.sequence_no DESC NULLS LAST, v.submitted_at DESC
      LIMIT 1
    `, [row.portfolio_id]);
    const previousId = previous.rows[0]?.id;
    if (!previousId) throw new Error('INITIAL_VERSION_REQUIRED');
    const feedback = await pool.query('SELECT 1 FROM feedbacks WHERE portfolio_id=$1 AND version_id=$2 LIMIT 1', [row.portfolio_id, previousId]);
    if (!feedback.rows.length) throw new Error('FEEDBACK_REQUIRED_BEFORE_REVISION');
  }

  const result = await academicActionV3(user, input, req);
  return updateAiPromptAfterVersion(result);
}

async function aiClaimReview(user, input, req) {
  if (user.role !== 'ai') throw new Error('FORBIDDEN');
  const reviewId = cleanTrimmed(input.reviewId, 80);
  if (!isUuid(reviewId)) throw new Error('AI_REVIEW_NOT_FOUND');

  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT id,status,teacher_review_status,reviewer_id
      FROM ai_review_requests
      WHERE id=$1
      FOR UPDATE
    `, [reviewId]);
    const row = result.rows[0];
    if (!row) throw new Error('AI_REVIEW_NOT_FOUND');
    if (row.teacher_review_status !== 'pending' || row.status === 'completed') throw new Error('AI_REVIEW_CLOSED');
    if (!['pending','in_progress'].includes(row.status)) throw new Error('AI_REVIEW_CLOSED');
    if (row.reviewer_id && row.reviewer_id !== user.id) throw new Error('AI_REVIEW_CLAIMED');

    await client.query(`
      UPDATE ai_review_requests
      SET reviewer_id=$2, status='in_progress'
      WHERE id=$1
    `, [reviewId, user.id]);
    await audit(client, user, 'AI_CLAIM_REVIEW', 'ai_review', reviewId, { status: 'in_progress' }, req);
    await client.query('COMMIT');
    return { ok: true, reviewId, status: 'in_progress' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
      SELECT ar.*, p.id portfolio_id
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      WHERE ar.id=$1
      FOR UPDATE OF ar
    `, [reviewId]);
    const row = result.rows[0];
    if (!row) throw new Error('AI_REVIEW_NOT_FOUND');
    if (row.reviewer_id && row.reviewer_id !== user.id) throw new Error('AI_REVIEW_CLAIMED');
    if (row.status === 'completed') {
      const existing = await client.query("SELECT id FROM feedbacks WHERE source_ai_review_id=$1 AND author_role='ai' LIMIT 1", [reviewId]);
      await client.query('COMMIT');
      return { ok: true, isIdempotentRetry: true, feedbackId: existing.rows[0]?.id || null, visibleToStudent: true, teacherReviewAvailable: true };
    }
    if (!['pending', 'in_progress'].includes(row.status)) throw new Error('AI_REVIEW_CLOSED');

    const rubricProposal = input.rubricProposal && typeof input.rubricProposal === 'object' ? input.rubricProposal : null;
    await client.query(`
      UPDATE ai_review_requests
      SET status='completed', response=$2, rubric_proposal_json=$3, reviewer_id=$4,
          completed_at=now(), teacher_review_status='pending', final_response=''
      WHERE id=$1
    `, [reviewId, response, rubricProposal ? JSON.stringify(rubricProposal) : null, user.id]);

    const feedback = await client.query(`
      INSERT INTO feedbacks(
        portfolio_id, version_id, axis_id, selected_snippet, comment,
        author_id, author_role, source_ai_review_id, anchor_json
      ) VALUES($1,$2,$3,$4,$5,$6,'ai',$7,$8)
      ON CONFLICT(source_ai_review_id) WHERE source_ai_review_id IS NOT NULL DO NOTHING
      RETURNING id
    `, [row.portfolio_id, row.version_id, axisId, cleanText(input.selectedSnippet, 5000), response, user.id, reviewId,
      JSON.stringify({ source: 'manual_chatgpt_response', teacherReviewStatus: 'pending' })]);
    let feedbackId = feedback.rows[0]?.id || null;
    if (!feedbackId) {
      const existing = await client.query("SELECT id FROM feedbacks WHERE source_ai_review_id=$1 AND author_role='ai' LIMIT 1", [reviewId]);
      feedbackId = existing.rows[0]?.id || null;
    }

    await client.query("UPDATE portfolios SET status='feedback_received', updated_at=now() WHERE id=$1", [row.portfolio_id]);
    await audit(client, user, 'AI_PUBLISH_FEEDBACK', 'ai_review', reviewId, { feedbackId, axisId, visibleToStudent: true, teacherReviewAvailable: true }, req);
    await client.query('COMMIT');
    return { ok: true, feedbackId, visibleToStudent: true, teacherReviewAvailable: true, portfolioStatus: 'feedback_received' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function teacherReviewAi(user, input, req) {
  if (user.role !== 'teacher') throw new Error('FORBIDDEN');
  const reviewId = cleanTrimmed(input.reviewId, 80);
  if (!isUuid(reviewId)) throw new Error('AI_REVIEW_NOT_FOUND');
  const decision = cleanTrimmed(input.decision || input.status, 20);
  if (!ALLOWED_DECISIONS.has(decision)) throw new Error('INVALID_STATUS');
  const axisId = cleanTrimmed(input.axisId || 'form_argument', 50);
  if (!AXES.includes(axisId)) throw new Error('INVALID_AXIS');

  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      SELECT ar.*, p.student_id, p.id portfolio_id, a.class_id, a.public_id assignment_public_id,
             v.version_number, v.stage
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id=ar.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.id=ar.version_id
      WHERE ar.id=$1
      FOR UPDATE OF ar
    `, [reviewId]);
    const row = result.rows[0];
    if (!row) throw new Error('AI_REVIEW_NOT_FOUND');
    if (row.status !== 'completed') throw new Error('AI_REVIEW_NOT_COMPLETED');
    if (!(await teacherCanAccessClass(client, row.class_id, user.id))) throw new Error('TEACHER_CLASS_FORBIDDEN');

    if (row.teacher_review_status !== 'pending') {
      await client.query('COMMIT');
      return { ok: true, isIdempotentRetry: true, decision: row.teacher_review_status };
    }

    const finalResponse = decision === 'revised' ? cleanTrimmed(input.finalResponse, 100000) : '';
    if (decision === 'revised' && !finalResponse) throw new Error('REVISED_RESPONSE_REQUIRED');
    const teacherNote = cleanTrimmed(input.teacherNote || input.note, 10000);

    await client.query(`
      UPDATE ai_review_requests
      SET teacher_review_status=$2, final_response=$3, teacher_id=$4,
          teacher_reviewed_at=now(), teacher_note=$5
      WHERE id=$1
    `, [reviewId, decision, finalResponse, user.id, teacherNote]);

    let teacherFeedbackId = null;
    if (decision === 'revised' && finalResponse) {
      const inserted = await client.query(`
        INSERT INTO feedbacks(
          portfolio_id, version_id, axis_id, selected_snippet, comment,
          author_id, author_role, anchor_json
        ) VALUES($1,$2,$3,$4,$5,$6,'teacher',$7)
        RETURNING id
      `, [row.portfolio_id, row.version_id, axisId, cleanText(input.selectedSnippet, 5000), finalResponse, user.id,
        JSON.stringify({ source: 'teacher_revision_of_ai', sourceAiReviewId: reviewId })]);
      teacherFeedbackId = inserted.rows[0]?.id || null;
    }

    await client.query("UPDATE portfolios SET status='feedback_received', updated_at=now() WHERE id=$1", [row.portfolio_id]);
    await audit(client, user, 'TEACHER_REVIEW_AI_FEEDBACK', 'ai_review', reviewId, {
      decision,
      teacherFeedbackId,
      aiFeedbackRemainsVisible: true,
      teacherRevisionVisible: Boolean(teacherFeedbackId)
    }, req);
    await client.query('COMMIT');
    return { ok: true, decision, feedbackId: teacherFeedbackId, portfolioStatus: 'feedback_received', aiFeedbackRemainsVisible: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function saveReflection(user, input, req) {
  if (user.role !== 'student') throw new Error('FORBIDDEN');
  const assignmentId = cleanTrimmed(input.assignmentId, 200);
  const versionId = cleanTrimmed(input.versionId, 80);
  if (!assignmentId || !isUuid(versionId)) throw new Error('VERSION_REQUIRED');
  const raw = input.reflection && typeof input.reflection === 'object' ? input.reflection : {};
  const reflection = {
    changedUnderstanding: cleanTrimmed(raw.changedUnderstanding, 12000),
    mostUsefulFeedback: cleanTrimmed(raw.mostUsefulFeedback, 12000),
    incompleteInV1: cleanTrimmed(raw.incompleteInV1, 12000),
    improvedInV2: cleanTrimmed(raw.improvedInV2, 12000),
    transferToNextReading: cleanTrimmed(raw.transferToNextReading, 12000)
  };
  if (Object.values(reflection).some(value => !value)) throw new Error('REFLECTION_REQUIRED');

  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await client.query(`
      SELECT p.id portfolio_id, v.id version_id, v.stage
      FROM portfolios p
      JOIN assignments a ON a.id=p.assignment_id
      JOIN portfolio_versions v ON v.portfolio_id=p.id
      WHERE p.student_id=$1 AND a.public_id=$2 AND v.id=$3
      LIMIT 1
      FOR UPDATE OF p
    `, [user.id, assignmentId, versionId]);
    const row = target.rows[0];
    if (!row) throw new Error('VERSION_NOT_FOUND');
    if (row.stage !== 'revision') throw new Error('REFLECTION_REQUIRES_REVISION');

    const inserted = await client.query(`
      INSERT INTO student_reflections(portfolio_id, version_id, reflection_json, created_by)
      VALUES($1,$2,$3,$4)
      ON CONFLICT(portfolio_id, version_id) DO NOTHING
      RETURNING id, created_at
    `, [row.portfolio_id, row.version_id, JSON.stringify(reflection), user.id]);
    let reflectionRow = inserted.rows[0];
    if (!reflectionRow) {
      const existing = await client.query('SELECT id, created_at FROM student_reflections WHERE portfolio_id=$1 AND version_id=$2', [row.portfolio_id, row.version_id]);
      reflectionRow = existing.rows[0];
    }
    await client.query("UPDATE portfolios SET status='waiting_official_rubric', updated_at=now() WHERE id=$1", [row.portfolio_id]);
    await audit(client, user, 'STUDENT_SUBMIT_REFLECTION', 'portfolio', row.portfolio_id, { reflectionId: reflectionRow.id, versionId }, req);
    await client.query('COMMIT');
    return { ok: true, id: reflectionRow.id, createdAt: reflectionRow.created_at, portfolioStatus: 'waiting_official_rubric' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function submitRubricWithWorkflow(user, input, req) {
  if (user.role === 'admin') throw new Error('FORBIDDEN');
  if (user.role === 'teacher') {
    const pool = await getPool();
    const check = await pool.query(`
      SELECT 1
      FROM student_reflections sr
      JOIN portfolio_versions v ON v.id=sr.version_id
      JOIN portfolios p ON p.id=sr.portfolio_id
      JOIN assignments a ON a.id=p.assignment_id
      JOIN class_members cm ON cm.class_id=a.class_id AND cm.user_id=$1 AND cm.member_role='teacher'
      WHERE sr.version_id=$2 AND a.public_id=$3 AND p.student_id=$4
      LIMIT 1
    `, [user.id, cleanTrimmed(input.versionId, 80), cleanTrimmed(input.assignmentId, 200), cleanTrimmed(input.studentId, 80)]);
    if (!check.rows.length) throw new Error('REFLECTION_REQUIRED_BEFORE_OFFICIAL_RUBRIC');
  }

  const result = await academicActionV3(user, input, req);
  if (user.role === 'teacher' && result?.ok) {
    const pool = await getPool();
    await pool.query(`
      UPDATE portfolios p
      SET status='completed', updated_at=now()
      FROM assignments a
      WHERE p.assignment_id=a.id AND a.public_id=$1 AND p.student_id=$2
    `, [cleanTrimmed(input.assignmentId, 200), cleanTrimmed(input.studentId, 80)]);
  }
  return result;
}

export async function getAcademicSnapshot(user) {
  const snapshot = await getAcademicSnapshotV3(user);
  if (!['student', 'teacher', 'admin'].includes(user.role)) return { ...snapshot, reflections: [] };

  const dbPortfolioIds = Object.values(snapshot.portfolios || {}).map(portfolio => portfolio?.dbId).filter(isUuid);
  if (!dbPortfolioIds.length) return { ...snapshot, reflections: [] };

  const pool = await getPool();
  const rows = await pool.query(`
    SELECT sr.id, sr.portfolio_id, sr.version_id, sr.reflection_json, sr.created_at,
           a.public_id assignment_id, p.student_id, v.version_number
    FROM student_reflections sr
    JOIN portfolios p ON p.id=sr.portfolio_id
    JOIN assignments a ON a.id=p.assignment_id
    JOIN portfolio_versions v ON v.id=sr.version_id
    WHERE sr.portfolio_id=ANY($1::uuid[])
    ORDER BY sr.created_at DESC
  `, [dbPortfolioIds]);
  return {
    ...snapshot,
    reflections: rows.rows.map(row => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      versionId: row.version_id,
      versionNumber: row.version_number,
      reflection: row.reflection_json || {},
      createdAt: row.created_at
    }))
  };
}

export async function academicAction(user, input, req) {
  assertSameOrigin(req);
  const action = cleanTrimmed(input?.action, 80);
  if (action === 'save_draft') return saveDraftWithWorkflow(user, input, req);
  if (action === 'create_version') return createVersionWithWorkflow(user, input, req);
  if (action === 'ai_claim_review') return aiClaimReview(user, input, req);
  if (action === 'ai_complete_review') return aiCompleteReview(user, input, req);
  if (action === 'teacher_review_ai') return teacherReviewAi(user, input, req);
  if (action === 'save_reflection') return saveReflection(user, input, req);
  if (action === 'submit_rubric') return submitRubricWithWorkflow(user, input, req);
  return academicActionV3(user, input, req);
}
