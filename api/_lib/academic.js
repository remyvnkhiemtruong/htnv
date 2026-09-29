import { createHash, createHmac } from "node:crypto";
import { ensureSchema } from "../auth/auth.js";
import { getPool } from "./db.js";

let schemaReadyPromise = null;

const AXES = [
  "plot_situation",
  "character_detail",
  "narrator_pov",
  "space_time",
  "language_tone_symbol",
  "form_argument"
];

const DEFAULT_LEVELS = [
  { level: 1, label: "Chưa đạt", score: 1, description: "Nhận biết còn hạn chế", observableIndicators: [] },
  { level: 2, label: "Đạt", score: 2, description: "Xác định và giải thích được", observableIndicators: [] },
  { level: 3, label: "Khá", score: 3, description: "Phân tích có dẫn chứng và liên hệ", observableIndicators: [] },
  { level: 4, label: "Xuất sắc", score: 4, description: "Phân tích sâu, lập luận thuyết phục", observableIndicators: [] }
];

export function emptyDraft() {
  return Object.fromEntries(AXES.map(axisId => [axisId, { axisId, analysisText: "", evidenceQuotes: [] }]));
}

function wordCount(content) {
  return Object.values(content || {}).reduce((sum, item) => {
    const text = String(item?.analysisText || "").trim();
    return sum + (text ? text.split(/\s+/).length : 0);
  }, 0);
}

function clientIp(req) {
  return String(req?.headers?.["x-forwarded-for"] || req?.socket?.remoteAddress || "").split(",")[0].trim();
}

export function assertSameOrigin(req) {
  const origin = String(req?.headers?.origin || "");
  if (!origin) return;
  const host = String(req?.headers?.["x-forwarded-host"] || req?.headers?.host || "");
  try {
    if (new URL(origin).host !== host) throw new Error("CSRF_ORIGIN_MISMATCH");
  } catch (error) {
    if (String(error?.message) === "CSRF_ORIGIN_MISMATCH") throw error;
    throw new Error("INVALID_ORIGIN");
  }
}

export function researcherPseudonym(studentId) {
  const secret = process.env.RESEARCH_PSEUDONYM_SECRET || process.env.JWT_SECRET || "cvt-research-stable-seed";
  const hash = createHmac("sha256", secret).update(String(studentId || "")).digest("hex");
  return `HS-ANON-${hash.slice(0, 6).toUpperCase()}`;
}

export function anonymizeCohort(classCode) {
  if (!classCode) return "Nhóm 00";
  const secret = process.env.RESEARCH_PSEUDONYM_SECRET || process.env.JWT_SECRET || "cvt-research-cohort-seed";
  const hash = createHmac("sha256", secret).update(String(classCode || "")).digest("hex");
  return `Nhóm ${hash.slice(0, 4).toUpperCase()}`;
}

async function auditWithClient(client, user, action, targetType, targetId, beforeJson = null, afterJson = null, req = null) {
  await client.query(`
    INSERT INTO audit_logs(actor_id, actor_role, action, target_type, target_id, before_json, after_json, ip_address)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    user?.id || null,
    user?.role || "system",
    action,
    targetType || "",
    String(targetId || ""),
    beforeJson ? JSON.stringify(beforeJson) : null,
    afterJson ? JSON.stringify(afterJson) : null,
    req ? clientIp(req) : ""
  ]);
}

async function audit(p, user, action, targetType, targetId, beforeJson = null, afterJson = null, req = null) {
  await p.query(`
    INSERT INTO audit_logs(actor_id, actor_role, action, target_type, target_id, before_json, after_json, ip_address)
    VALUES($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    user?.id || null,
    user?.role || "system",
    action,
    targetType || "",
    String(targetId || ""),
    beforeJson ? JSON.stringify(beforeJson) : null,
    afterJson ? JSON.stringify(afterJson) : null,
    req ? clientIp(req) : ""
  ]);
}

async function runAcademicSchema() {
  await ensureSchema();
  const p = await getPool();

  const statements = [
    "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'",
    "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()",
    "ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login timestamptz",
    `CREATE TABLE IF NOT EXISTS classes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL,
      school_year text NOT NULL DEFAULT '2026-2027', created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS class_members (
      class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      member_role text NOT NULL CHECK (member_role IN ('student','teacher')), joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(class_id,user_id))`,
    `CREATE TABLE IF NOT EXISTS literature_texts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_id text UNIQUE NOT NULL, title text NOT NULL, author text NOT NULL,
      year_text text NOT NULL DEFAULT '', genre text NOT NULL DEFAULT '', synopsis text NOT NULL DEFAULT '', excerpt text NOT NULL DEFAULT '',
      full_content text NOT NULL DEFAULT '', historical_context text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}',
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS rubrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_id text UNIQUE NOT NULL, title text NOT NULL, description text NOT NULL DEFAULT '',
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS rubric_criteria (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rubric_id uuid NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE, public_id text NOT NULL,
      axis_id text NOT NULL CHECK (axis_id IN ('plot_situation','character_detail','narrator_pov','space_time','language_tone_symbol','form_argument')),
      title text NOT NULL, weight numeric NOT NULL DEFAULT 1, levels_json jsonb NOT NULL DEFAULT '[]'::jsonb, sort_order integer NOT NULL DEFAULT 0,
      UNIQUE(rubric_id,public_id))`,
    `CREATE TABLE IF NOT EXISTS assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_id text UNIQUE NOT NULL, class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
      text_id uuid REFERENCES literature_texts(id) ON DELETE SET NULL, rubric_id uuid REFERENCES rubrics(id) ON DELETE SET NULL, title text NOT NULL,
      assigned_at timestamptz NOT NULL DEFAULT now(), deadline timestamptz, difficulty text NOT NULL DEFAULT 'Cơ bản' CHECK (difficulty IN ('Cơ bản','Nâng cao','Chuyên sâu')),
      target_axes text[] NOT NULL DEFAULT '{}', prompt text NOT NULL DEFAULT '', guiding_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
      starter_template jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','closed')),
      ai_guidance text NOT NULL DEFAULT '', common_mistakes text NOT NULL DEFAULT '', reference_guide text NOT NULL DEFAULT '',
      prediction_template jsonb NOT NULL DEFAULT '{}'::jsonb, workflow_config jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS ai_guidance text NOT NULL DEFAULT ''",
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS common_mistakes text NOT NULL DEFAULT ''",
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS reference_guide text NOT NULL DEFAULT ''",
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS prediction_template jsonb NOT NULL DEFAULT '{}'::jsonb",
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS workflow_config jsonb NOT NULL DEFAULT '{}'::jsonb",
    `CREATE TABLE IF NOT EXISTS portfolios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'drafting',
      active_version text NOT NULL DEFAULT 'v1.0 (nháp)', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(assignment_id,student_id))`,
    `CREATE TABLE IF NOT EXISTS portfolio_drafts (
      portfolio_id uuid PRIMARY KEY REFERENCES portfolios(id) ON DELETE CASCADE, content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now(),
      draft_revision bigint NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS portfolio_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      version_number text NOT NULL, content_json jsonb NOT NULL, change_summary text NOT NULL DEFAULT '',
      created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, word_count integer NOT NULL DEFAULT 0,
      submitted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(portfolio_id,version_number))`,
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS sequence_no integer",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'initial'",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS confidence smallint CHECK (confidence IS NULL OR (confidence >= 1 AND confidence <= 5))",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS change_source text",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS revision_reason text",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES portfolio_versions(id) ON DELETE SET NULL",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS content_checksum text",
    "ALTER TABLE portfolio_versions ADD COLUMN IF NOT EXISTS submission_key uuid",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_submission_key ON portfolio_versions(portfolio_id, submission_key) WHERE submission_key IS NOT NULL",
    `CREATE TABLE IF NOT EXISTS version_feedback_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      version_id uuid NOT NULL REFERENCES portfolio_versions(id) ON DELETE CASCADE,
      feedback_id uuid NOT NULL,
      relation text NOT NULL DEFAULT 'prompted_revision',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(version_id, feedback_id))`,
    `CREATE TABLE IF NOT EXISTS feedbacks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      version_id uuid REFERENCES portfolio_versions(id) ON DELETE SET NULL,
      axis_id text NOT NULL CHECK (axis_id IN ('plot_situation','character_detail','narrator_pov','space_time','language_tone_symbol','form_argument')),
      selected_snippet text NOT NULL DEFAULT '', comment text NOT NULL, author_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      author_role text NOT NULL CHECK (author_role IN ('teacher','peer','ai')), resolved boolean NOT NULL DEFAULT false,
      resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`,
    "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS resolved_by_version_id uuid REFERENCES portfolio_versions(id) ON DELETE SET NULL",
    "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS source_ai_review_id uuid",
    "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS criterion_public_id text",
    "ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS anchor_json jsonb",
    `CREATE TABLE IF NOT EXISTS rubric_submissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      version_id uuid REFERENCES portfolio_versions(id) ON DELETE SET NULL, evaluator_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      evaluator_role text NOT NULL CHECK (evaluator_role IN ('student','peer','teacher')), criterion_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
      overall_feedback text NOT NULL DEFAULT '', total_score numeric NOT NULL DEFAULT 0, max_score numeric NOT NULL DEFAULT 0,
      submitted_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS ai_review_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), portfolio_id uuid NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      version_id uuid NOT NULL REFERENCES portfolio_versions(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','rejected')),
      prompt text NOT NULL DEFAULT '', response text NOT NULL DEFAULT '', reviewer_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
      teacher_review_status text NOT NULL DEFAULT 'pending' CHECK (teacher_review_status IN ('pending','approved','revised','rejected')),
      teacher_note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, UNIQUE(version_id))`,
    "ALTER TABLE ai_review_requests ADD COLUMN IF NOT EXISTS final_response text NOT NULL DEFAULT ''",
    "ALTER TABLE ai_review_requests ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL",
    "ALTER TABLE ai_review_requests ADD COLUMN IF NOT EXISTS teacher_reviewed_at timestamptz",
    "ALTER TABLE ai_review_requests ADD COLUMN IF NOT EXISTS rubric_proposal_json jsonb",
    "ALTER TABLE ai_review_requests ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'response'",
    `CREATE TABLE IF NOT EXISTS peer_review_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      reviewer_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      student_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      version_id uuid REFERENCES portfolio_versions(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
      assigned_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
      UNIQUE(assignment_id, reviewer_id, student_id))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES app_users(id) ON DELETE SET NULL, actor_role text NOT NULL,
      action text NOT NULL, target_type text NOT NULL DEFAULT '', target_id text NOT NULL DEFAULT '', before_json jsonb, after_json jsonb,
      ip_address text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS auth_rate_events (
      id bigserial PRIMARY KEY, event_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
    "CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id,assigned_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_portfolios_student ON portfolios(student_id,updated_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_versions_portfolio ON portfolio_versions(portfolio_id,submitted_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_feedbacks_portfolio ON feedbacks(portfolio_id,created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_ai_reviews_status ON ai_review_requests(status,created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_auth_rate_events_key_time ON auth_rate_events(event_key,created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_vfl_version ON version_feedback_links(version_id)",
    "CREATE INDEX IF NOT EXISTS idx_vfl_feedback ON version_feedback_links(feedback_id)",
    "CREATE INDEX IF NOT EXISTS idx_peer_rev_reviewer ON peer_review_assignments(reviewer_id)",
    "CREATE INDEX IF NOT EXISTS idx_peer_rev_student ON peer_review_assignments(student_id)"
  ];

  for (const statement of statements) {
    await p.query(statement);
  }

  // Update portfolios status constraint if needed
  try {
    await p.query("ALTER TABLE portfolios DROP CONSTRAINT IF EXISTS portfolios_status_check");
    await p.query(`ALTER TABLE portfolios ADD CONSTRAINT portfolios_status_check CHECK (status IN (
      'drafting',
      'submitted_waiting_ai',
      'ai_proposed_waiting_teacher',
      'feedback_received',
      'revising',
      'waiting_official_rubric',
      'completed',
      'v1_submitted',
      'v2_in_revision'
    ))`);
  } catch {
    // Constraint already satisfied or table not ready
  }

  // Backfill sequence_no for existing versions
  await p.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM portfolio_versions WHERE sequence_no IS NULL) THEN
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY portfolio_id ORDER BY submitted_at, id) as seq
          FROM portfolio_versions
        )
        UPDATE portfolio_versions pv
        SET sequence_no = ranked.seq,
            stage = CASE WHEN ranked.seq = 1 THEN 'initial' ELSE 'revision' END
        FROM ranked
        WHERE pv.id = ranked.id AND pv.sequence_no IS NULL;
      END IF;
    END $$;
  `);

  // Setup immutability trigger
  await p.query(`
    CREATE OR REPLACE FUNCTION prevent_portfolio_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'portfolio_versions are immutable'; END $$
  `);
  await p.query("DROP TRIGGER IF EXISTS portfolio_versions_immutable_update ON portfolio_versions");
  await p.query("CREATE TRIGGER portfolio_versions_immutable_update BEFORE UPDATE OR DELETE ON portfolio_versions FOR EACH ROW EXECUTE FUNCTION prevent_portfolio_version_mutation()");

  await seedAcademicData(p);
}

export async function ensureAcademicSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = runAcademicSchema().catch(err => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

async function seedAcademicData(p) {
  // Bootstrap class 11A1
  await p.query(`
    INSERT INTO classes(code, name, school_year, created_by)
    SELECT '11A1', 'Lớp 11A1', '2026-2027', id FROM app_users WHERE lower(email) = 'giaovien@cvt.edu.vn' LIMIT 1
    ON CONFLICT(code) DO NOTHING
  `);

  // Bootstrap membership strictly for initial accounts
  await p.query(`
    INSERT INTO class_members(class_id, user_id, member_role)
    SELECT c.id, u.id, 'teacher' FROM classes c
    JOIN app_users u ON lower(u.email) = 'giaovien@cvt.edu.vn'
    WHERE c.code = '11A1'
    ON CONFLICT DO NOTHING
  `);

  await p.query(`
    INSERT INTO class_members(class_id, user_id, member_role)
    SELECT c.id, u.id, 'student' FROM classes c
    JOIN app_users u ON lower(u.email) = 'hocsinh@cvt.edu.vn'
    WHERE c.code = '11A1'
    ON CONFLICT DO NOTHING
  `);

  await p.query(`
    INSERT INTO literature_texts(public_id, title, author, year_text, genre, synopsis, excerpt, historical_context, tags, created_by)
    SELECT 'vo-nhat', 'Vợ nhặt', 'Kim Lân', '1954 (viết về nạn đói 1945)', 'Truyện ngắn hiện thực',
      'Câu chuyện về Tràng và người vợ nhặt giữa nạn đói, làm nổi bật tình người và khát vọng sống.',
      'Sáng hôm sau, mặt trời lên bằng con sào, Tràng mới trở dậy. Trong người êm ái lơ lửng như người vừa ở trong giấc mơ đi ra.',
      'Bối cảnh nạn đói năm 1945 và sức sống của người lao động nghèo.',
      ARRAY['Hiện thực','Nạn đói 1945','Tình người','Khát vọng sống'],
      id
    FROM app_users WHERE lower(email) = 'giaovien@cvt.edu.vn' LIMIT 1
    ON CONFLICT(public_id) DO NOTHING
  `);

  await p.query(`
    INSERT INTO rubrics(public_id, title, description, created_by)
    SELECT 'rubric-poetics-std', 'Ma trận Rubric Đánh giá Năng lực Đọc hiểu theo 6 Trục Thi pháp',
      'Rubric 4 mức dùng cho đọc hiểu truyện ngắn hiện đại.',
      id FROM app_users WHERE lower(email) = 'giaovien@cvt.edu.vn' LIMIT 1
    ON CONFLICT(public_id) DO NOTHING
  `);

  const criteria = [
    ["criterion-plot", "plot_situation", "Tình huống – Cốt truyện"],
    ["criterion-character", "character_detail", "Nhân vật – Chi tiết nghệ thuật"],
    ["criterion-narrator", "narrator_pov", "Người kể chuyện – Điểm nhìn"],
    ["criterion-space", "space_time", "Không gian – Thời gian"],
    ["criterion-language", "language_tone_symbol", "Ngôn ngữ – Giọng điệu – Biểu tượng"],
    ["criterion-form", "form_argument", "Hình thức – Nội dung và Lập luận"]
  ];

  for (let i = 0; i < criteria.length; i++) {
    const [publicId, axisId, title] = criteria[i];
    await p.query(`
      INSERT INTO rubric_criteria(rubric_id, public_id, axis_id, title, weight, levels_json, sort_order)
      SELECT id, $1, $2, $3, 1, $4::jsonb, $5 FROM rubrics WHERE public_id = 'rubric-poetics-std'
      ON CONFLICT(rubric_id, public_id) DO NOTHING
    `, [publicId, axisId, title, JSON.stringify(DEFAULT_LEVELS), i + 1]);
  }

  await p.query(`
    INSERT INTO assignments(public_id, class_id, text_id, rubric_id, title, assigned_at, deadline, difficulty, target_axes, prompt, guiding_steps, status, created_by)
    SELECT 'assign-vo-nhat', c.id, t.id, r.id, 'Phân tích Vợ nhặt theo 6 trục thi pháp', now(), now() + interval '30 days', 'Nâng cao', $1,
      'Phân tích truyện ngắn Vợ nhặt theo 6 trục thi pháp, sử dụng dẫn chứng và lí giải rõ ràng.', $2::jsonb, 'published', u.id
    FROM classes c, literature_texts t, rubrics r
    CROSS JOIN LATERAL (SELECT id FROM app_users WHERE lower(email) = 'giaovien@cvt.edu.vn' LIMIT 1) u
    WHERE c.code = '11A1' AND t.public_id = 'vo-nhat' AND r.public_id = 'rubric-poetics-std'
    ON CONFLICT(public_id) DO NOTHING
  `, [
    AXES,
    JSON.stringify([
      "Đọc văn bản và xác định tình huống truyện",
      "Phân tích nhân vật và chi tiết nghệ thuật",
      "Xác định điểm nhìn trần thuật",
      "Khảo sát không gian – thời gian",
      "Phân tích ngôn ngữ, giọng điệu, biểu tượng",
      "Tổng hợp thành lập luận hoàn chỉnh"
    ])
  ]);

  await p.query(`
    INSERT INTO portfolios(assignment_id, student_id)
    SELECT a.id, u.id FROM assignments a
    JOIN class_members cm ON cm.class_id = a.class_id AND cm.member_role = 'student'
    JOIN app_users u ON u.id = cm.user_id
    WHERE a.status = 'published'
    ON CONFLICT(assignment_id, student_id) DO NOTHING
  `);

  await p.query(`
    INSERT INTO portfolio_drafts(portfolio_id, content_json, updated_by)
    SELECT p.id, $1::jsonb, p.student_id FROM portfolios p
    ON CONFLICT(portfolio_id) DO NOTHING
  `, [JSON.stringify(emptyDraft())]);
}

async function portfolioByPublicIds(p, assignmentPublicId, studentId) {
  const result = await p.query(`
    SELECT p.*, a.public_id assignment_public_id, a.class_id
    FROM portfolios p
    JOIN assignments a ON a.id = p.assignment_id
    WHERE a.public_id = $1 AND p.student_id = $2
    LIMIT 1
  `, [assignmentPublicId, studentId]);
  return result.rows[0] || null;
}

export async function getAcademicSnapshot(user) {
  await ensureAcademicSchema();
  const p = await getPool();

  const role = user.role;

  // 1. Determine accessible classes and assignments
  let classesQuery;
  let assignmentsQuery;
  let portfoliosQuery;
  let usersQuery;
  let aiReviewsQuery;
  let auditLogsQuery;

  if (role === "admin") {
    classesQuery = await p.query(`
      SELECT c.*, COUNT(*) FILTER(WHERE cm.member_role = 'student')::int student_count
      FROM classes c LEFT JOIN class_members cm ON cm.class_id = c.id
      GROUP BY c.id ORDER BY c.code
    `);
    assignmentsQuery = await p.query(`
      SELECT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      ORDER BY a.assigned_at DESC
    `);
    portfoliosQuery = await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      ORDER BY p.updated_at DESC
    `);
    usersQuery = await p.query(`
      SELECT u.id, u.email, u.name, u.role, u.account_status, u.must_change_password, u.created_at, u.last_login, c.code class_code
      FROM app_users u
      LEFT JOIN class_members cm ON cm.user_id = u.id AND cm.member_role = 'student'
      LEFT JOIN classes c ON c.id = cm.class_id
      ORDER BY u.name
    `);
    aiReviewsQuery = await p.query(`
      SELECT ar.*, a.public_id assignment_id, u.id student_id, u.name student_name, v.version_number
      FROM ai_review_requests ar
      JOIN portfolio_versions v ON v.id = ar.version_id
      JOIN portfolios p0 ON p0.id = ar.portfolio_id
      JOIN assignments a ON a.id = p0.assignment_id
      JOIN app_users u ON u.id = p0.student_id
      ORDER BY ar.created_at DESC
    `);
    auditLogsQuery = await p.query(`
      SELECT l.*, u.name actor_name
      FROM audit_logs l
      LEFT JOIN app_users u ON u.id = l.actor_id
      ORDER BY l.created_at DESC LIMIT 200
    `);
  } else if (role === "teacher") {
    // Teacher: only assigned classes
    classesQuery = await p.query(`
      SELECT c.*, COUNT(*) FILTER(WHERE cm2.member_role = 'student')::int student_count
      FROM classes c
      JOIN class_members cm ON cm.class_id = c.id AND cm.user_id = $1 AND cm.member_role = 'teacher'
      LEFT JOIN class_members cm2 ON cm2.class_id = c.id
      GROUP BY c.id ORDER BY c.code
    `, [user.id]);
    const teacherClassIds = classesQuery.rows.map(c => c.id);

    assignmentsQuery = teacherClassIds.length ? await p.query(`
      SELECT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      WHERE a.class_id = ANY($1::uuid[])
      ORDER BY a.assigned_at DESC
    `, [teacherClassIds]) : { rows: [] };

    portfoliosQuery = teacherClassIds.length ? await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      WHERE a.class_id = ANY($1::uuid[])
      ORDER BY p.updated_at DESC
    `, [teacherClassIds]) : { rows: [] };

    usersQuery = teacherClassIds.length ? await p.query(`
      SELECT DISTINCT u.id, u.email, u.name, u.role, u.account_status, u.must_change_password, u.created_at, u.last_login, c.code class_code
      FROM app_users u
      JOIN class_members cm ON cm.user_id = u.id
      JOIN classes c ON c.id = cm.class_id
      WHERE cm.class_id = ANY($1::uuid[])
      ORDER BY u.name
    `, [teacherClassIds]) : { rows: [] };

    aiReviewsQuery = teacherClassIds.length ? await p.query(`
      SELECT ar.*, a.public_id assignment_id, u.id student_id, u.name student_name, v.version_number
      FROM ai_review_requests ar
      JOIN portfolio_versions v ON v.id = ar.version_id
      JOIN portfolios p0 ON p0.id = ar.portfolio_id
      JOIN assignments a ON a.id = p0.assignment_id
      JOIN app_users u ON u.id = p0.student_id
      WHERE a.class_id = ANY($1::uuid[])
      ORDER BY ar.created_at DESC
    `, [teacherClassIds]) : { rows: [] };

    auditLogsQuery = { rows: [] };
  } else if (role === "student") {
    classesQuery = await p.query(`
      SELECT c.*, 1::int student_count
      FROM classes c
      JOIN class_members cm ON cm.class_id = c.id AND cm.user_id = $1
    `, [user.id]);

    assignmentsQuery = await p.query(`
      SELECT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      JOIN class_members cm ON cm.class_id = a.class_id AND cm.user_id = $1
      WHERE a.status <> 'draft'
      ORDER BY a.assigned_at DESC
    `, [user.id]);

    portfoliosQuery = await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      WHERE p.student_id = $1
      ORDER BY p.updated_at DESC
    `, [user.id]);

    usersQuery = { rows: [] };
    aiReviewsQuery = { rows: [] };
    auditLogsQuery = { rows: [] };
  } else if (role === "peer") {
    // Peer: only assigned peer review portfolios
    classesQuery = { rows: [] };
    assignmentsQuery = await p.query(`
      SELECT DISTINCT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      JOIN peer_review_assignments pra ON pra.assignment_id = a.id AND pra.reviewer_id = $1
      WHERE a.status = 'published'
    `, [user.id]);

    portfoliosQuery = await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      JOIN peer_review_assignments pra ON pra.assignment_id = p.assignment_id AND pra.student_id = p.student_id AND pra.reviewer_id = $1
      ORDER BY p.updated_at DESC
    `, [user.id]);

    usersQuery = { rows: [] };
    aiReviewsQuery = { rows: [] };
    auditLogsQuery = { rows: [] };
  } else if (role === "ai") {
    // AI: only queue-related items
    classesQuery = { rows: [] };
    aiReviewsQuery = await p.query(`
      SELECT ar.*, a.public_id assignment_id, u.id student_id, u.name student_name, v.version_number
      FROM ai_review_requests ar
      JOIN portfolio_versions v ON v.id = ar.version_id
      JOIN portfolios p0 ON p0.id = ar.portfolio_id
      JOIN assignments a ON a.id = p0.assignment_id
      JOIN app_users u ON u.id = p0.student_id
      ORDER BY ar.created_at DESC
    `);
    const aiPortfolioIds = Array.from(new Set(aiReviewsQuery.rows.map(r => r.portfolio_id)));
    const aiAssignmentIds = Array.from(new Set(aiReviewsQuery.rows.map(r => r.assignment_id)));

    assignmentsQuery = aiAssignmentIds.length ? await p.query(`
      SELECT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      WHERE a.public_id = ANY($1::text[])
    `, [aiAssignmentIds]) : { rows: [] };

    portfoliosQuery = aiPortfolioIds.length ? await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      WHERE p.id = ANY($1::uuid[])
    `, [aiPortfolioIds]) : { rows: [] };

    usersQuery = { rows: [] };
    auditLogsQuery = { rows: [] };
  } else if (role === "researcher") {
    // Researcher: ALL data, but SERVER-SIDE ANONYMIZED
    classesQuery = { rows: [] };
    assignmentsQuery = await p.query(`
      SELECT a.*, c.code class_code, t.public_id text_public_id, r.public_id rubric_public_id
      FROM assignments a
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN literature_texts t ON t.id = a.text_id
      LEFT JOIN rubrics r ON r.id = a.rubric_id
      ORDER BY a.assigned_at DESC
    `);

    portfoliosQuery = await p.query(`
      SELECT p.*, a.public_id assignment_public_id, u.name student_name, c.code class_code, d.content_json, d.updated_at draft_updated_at
      FROM portfolios p
      JOIN assignments a ON a.id = p.assignment_id
      JOIN app_users u ON u.id = p.student_id
      LEFT JOIN classes c ON c.id = a.class_id
      LEFT JOIN portfolio_drafts d ON d.portfolio_id = p.id
      ORDER BY p.updated_at DESC
    `);

    usersQuery = { rows: [] };
    aiReviewsQuery = { rows: [] };
    auditLogsQuery = await p.query(`
      SELECT l.id, l.created_at, l.action, l.target_type, l.actor_role
      FROM audit_logs l
      ORDER BY l.created_at DESC LIMIT 200
    `);
  }

  // 2. Fetch literature texts and rubrics
  const texts = await p.query("SELECT * FROM literature_texts ORDER BY title");
  const rubricRows = await p.query(`
    SELECT r.public_id rubric_public_id, r.title rubric_title, rc.*
    FROM rubrics r
    LEFT JOIN rubric_criteria rc ON rc.rubric_id = r.id
    WHERE r.is_active = true
    ORDER BY rc.sort_order
  `);

  // 3. Portfolios, Versions, Feedbacks, Rubrics
  const portfolioIds = portfoliosQuery.rows.map(row => row.id);

  const versions = portfolioIds.length ? await p.query(`
    SELECT v.*, u.name author_name
    FROM portfolio_versions v
    LEFT JOIN app_users u ON u.id = v.created_by
    WHERE v.portfolio_id = ANY($1::uuid[])
    ORDER BY v.submitted_at
  `, [portfolioIds]) : { rows: [] };

  const feedbacks = portfolioIds.length ? await p.query(`
    SELECT f.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name author_name
    FROM feedbacks f
    JOIN portfolios p ON p.id = f.portfolio_id
    JOIN assignments a ON a.id = p.assignment_id
    LEFT JOIN portfolio_versions v ON v.id = f.version_id
    LEFT JOIN app_users u ON u.id = f.author_id
    WHERE f.portfolio_id = ANY($1::uuid[])
    ORDER BY f.created_at DESC
  `, [portfolioIds]) : { rows: [] };

  const subs = portfolioIds.length ? await p.query(`
    SELECT s.*, p.student_id, a.public_id assignment_public_id, v.version_number, u.name evaluator_name
    FROM rubric_submissions s
    JOIN portfolios p ON p.id = s.portfolio_id
    JOIN assignments a ON a.id = p.assignment_id
    LEFT JOIN portfolio_versions v ON v.id = s.version_id
    LEFT JOIN app_users u ON u.id = s.evaluator_id
    WHERE s.portfolio_id = ANY($1::uuid[])
    ORDER BY s.submitted_at DESC
  `, [portfolioIds]) : { rows: [] };

  // Organize versions by portfolio
  const versionsByPortfolio = new Map();
  for (const row of versions.rows) {
    if (!versionsByPortfolio.has(row.portfolio_id)) versionsByPortfolio.set(row.portfolio_id, []);
    const authorName = role === "researcher" ? "Tác giả ẩn danh" : (row.author_name || "Hệ thống");
    versionsByPortfolio.get(row.portfolio_id).push({
      id: row.id,
      versionNumber: row.version_number,
      sequenceNo: row.sequence_no || 1,
      stage: row.stage || "initial",
      confidence: row.confidence || null,
      changeSource: row.change_source || null,
      revisionReason: row.revision_reason || null,
      contentChecksum: row.content_checksum || null,
      createdAt: row.submitted_at,
      createdBy: role === "researcher" ? "" : (row.created_by || ""),
      authorName,
      changeSummary: row.change_summary,
      responses: row.content_json,
      isFrozen: true,
      isSubmitted: true
    });
  }

  // Organize portfolios
  const portfolios = {};
  for (const row of portfoliosQuery.rows) {
    const studentId = role === "researcher" ? researcherPseudonym(row.student_id) : row.student_id;
    const studentName = role === "researcher" ? studentId : row.student_name;
    const className = role === "researcher" ? anonymizeCohort(row.class_code) : (row.class_code || "");
    const id = `port-${studentId}-${row.assignment_public_id}`;

    portfolios[id] = {
      id,
      dbId: role === "researcher" ? "" : row.id,
      assignmentId: row.assignment_public_id,
      studentId,
      studentName,
      className,
      currentDraft: role === "researcher" ? emptyDraft() : (row.content_json || emptyDraft()),
      lastAutosavedAt: row.draft_updated_at || row.updated_at,
      versions: versionsByPortfolio.get(row.id) || [],
      currentActiveVersion: row.active_version,
      status: row.status
    };
  }

  const assignments = assignmentsQuery.rows.map(row => ({
    id: row.public_id,
    title: row.title,
    textId: row.text_public_id || "",
    classId: role === "researcher" ? anonymizeCohort(row.class_code) : (row.class_code || ""),
    assignedDate: row.assigned_at,
    deadline: row.deadline || "",
    difficulty: row.difficulty,
    targetAxes: row.target_axes || [],
    prompt: row.prompt,
    guidingSteps: row.guiding_steps || [],
    rubricId: row.rubric_public_id || "",
    starterTemplate: row.starter_template || {},
    aiGuidance: row.ai_guidance || "",
    commonMistakes: row.common_mistakes || "",
    referenceGuide: row.reference_guide || "",
    predictionTemplate: row.prediction_template || {},
    workflowConfig: row.workflow_config || {}
  }));

  const literatureTexts = texts.rows.map(row => ({
    id: row.public_id,
    title: row.title,
    author: row.author,
    year: row.year_text,
    genre: row.genre,
    synopsis: row.synopsis,
    excerpt: row.excerpt,
    fullContent: row.full_content,
    historicalContext: row.historical_context,
    tags: row.tags || []
  }));

  const rubricGroups = new Map();
  for (const row of rubricRows.rows) {
    if (!rubricGroups.has(row.rubric_public_id)) {
      rubricGroups.set(row.rubric_public_id, {
        id: row.rubric_public_id,
        title: row.rubric_title,
        criteria: []
      });
    }
    if (row.id) {
      rubricGroups.get(row.rubric_public_id).criteria.push({
        id: row.public_id,
        axisId: row.axis_id,
        title: row.title,
        weight: Number(row.weight),
        levels: row.levels_json || DEFAULT_LEVELS
      });
    }
  }
  const rubric = rubricGroups.values().next().value || { id: "rubric-poetics-std", title: "Rubric", criteria: [] };

  return {
    assignments,
    literatureTexts,
    rubric,
    portfolios,
    feedbacks: feedbacks.rows.map(row => {
      const studentId = role === "researcher" ? researcherPseudonym(row.student_id) : row.student_id;
      const authorName = role === "researcher"
        ? (row.author_role === "teacher" ? "Giáo viên" : (row.author_role === "peer" ? "Bạn học" : "AI"))
        : (row.author_name || (row.author_role === "ai" ? "AI" : "Giáo viên"));
      return {
        id: row.id,
        assignmentId: row.assignment_public_id,
        studentId,
        versionNumber: row.version_number || "",
        axisId: row.axis_id,
        selectedSnippet: row.selected_snippet,
        comment: row.comment,
        authorId: role === "researcher" ? "" : (row.author_id || ""),
        authorName,
        authorRole: row.author_role,
        createdAt: row.created_at,
        resolved: row.resolved,
        resolvedAt: row.resolved_at || null,
        resolvedByVersionId: row.resolved_by_version_id || null,
        sourceAiReviewId: row.source_ai_review_id || null
      };
    }),
    rubricSubmissions: subs.rows.map(row => {
      const studentId = role === "researcher" ? researcherPseudonym(row.student_id) : row.student_id;
      const evaluatorName = role === "researcher"
        ? (row.evaluator_role === "teacher" ? "Giáo viên" : (row.evaluator_role === "peer" ? "Đồng đẳng" : "Tự đánh giá"))
        : (row.evaluator_name || "Người chấm");
      return {
        id: row.id,
        assignmentId: row.assignment_public_id,
        studentId,
        versionNumber: row.version_number || "",
        evaluatorId: role === "researcher" ? "" : (row.evaluator_id || ""),
        evaluatorName,
        evaluatorRole: row.evaluator_role,
        criterionScores: row.criterion_scores || {},
        overallFeedback: row.overall_feedback,
        totalScore: Number(row.total_score),
        maxScore: Number(row.max_score),
        submittedAt: row.submitted_at
      };
    }),
    auditLogs: auditLogsQuery.rows.map(row => ({
      id: row.id,
      timestamp: row.created_at,
      actorName: role === "researcher" ? (row.actor_role === "admin" ? "Quản trị" : "Thành viên") : (row.actor_name || "Hệ thống"),
      actorRole: row.actor_role,
      action: row.action,
      target: `${row.target_type || ""}:${row.target_id || ""}`,
      ipAddress: role === "researcher" ? "" : (row.ip_address || "")
    })),
    classes: classesQuery.rows || [],
    users: usersQuery.rows || [],
    aiReviews: aiReviewsQuery.rows || []
  };
}

export async function academicAction(user, input, req) {
  await ensureAcademicSchema();
  assertSameOrigin(req);
  const pool = await getPool();
  const action = String(input?.action || "");

  // 1. SAVE DRAFT (autosave / manual save)
  if (action === "save_draft") {
    if (user.role !== "student") throw new Error("FORBIDDEN");
    const portfolio = await portfolioByPublicIds(pool, String(input.assignmentId), user.id);
    if (!portfolio) throw new Error("PORTFOLIO_NOT_FOUND");
    await pool.query(`
      INSERT INTO portfolio_drafts(portfolio_id, content_json, updated_by, updated_at)
      VALUES($1, $2, $3, now())
      ON CONFLICT(portfolio_id)
      DO UPDATE SET content_json = EXCLUDED.content_json, updated_by = EXCLUDED.updated_by, updated_at = now()
    `, [portfolio.id, input.content || emptyDraft(), user.id]);
    await pool.query("UPDATE portfolios SET updated_at = now() WHERE id = $1", [portfolio.id]);
    return { ok: true };
  }

  // 2. CREATE VERSION (student submits version -> immutable version + exactly 1 AI review request)
  if (action === "create_version") {
    if (user.role !== "student") throw new Error("FORBIDDEN");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock portfolio
      const pRes = await client.query(`
        SELECT p.*, a.id as assignment_db_id, a.public_id as assignment_public_id, a.prompt, a.target_axes, a.class_id
        FROM portfolios p
        JOIN assignments a ON a.id = p.assignment_id
        WHERE a.public_id = $1 AND p.student_id = $2
        FOR UPDATE OF p
      `, [String(input.assignmentId), user.id]);
      const portfolio = pRes.rows[0];
      if (!portfolio) throw new Error("PORTFOLIO_NOT_FOUND");

      // Idempotency check with submissionKey
      const submissionKey = input.submissionKey ? String(input.submissionKey) : null;
      if (submissionKey) {
        const existing = await client.query(
          "SELECT * FROM portfolio_versions WHERE portfolio_id = $1 AND submission_key = $2",
          [portfolio.id, submissionKey]
        );
        if (existing.rows.length > 0) {
          await client.query("COMMIT");
          const ver = existing.rows[0];
          return {
            ok: true,
            isIdempotentRetry: true,
            version: {
              id: ver.id,
              versionNumber: ver.version_number,
              sequenceNo: ver.sequence_no,
              stage: ver.stage,
              createdAt: ver.submitted_at
            },
            portfolioStatus: portfolio.status
          };
        }
      }

      // Content & draft
      const draftRes = await client.query("SELECT content_json FROM portfolio_drafts WHERE portfolio_id = $1", [portfolio.id]);
      const content = input.content || draftRes.rows[0]?.content_json || emptyDraft();

      // Sequence calculation
      const prevRes = await client.query(`
        SELECT id, version_number, sequence_no
        FROM portfolio_versions
        WHERE portfolio_id = $1
        ORDER BY sequence_no DESC, submitted_at DESC
        LIMIT 1
      `, [portfolio.id]);
      const prevVersion = prevRes.rows[0] || null;
      const nextSeq = prevVersion ? (Number(prevVersion.sequence_no) || 0) + 1 : 1;

      // Stage & Version Number
      const isPrediction = input.stage === "prediction";
      const stage = isPrediction ? "prediction" : (nextSeq === 1 ? "initial" : "revision");
      const versionNumber = isPrediction ? "v0.0" : `v${nextSeq}.0`;

      // V2+ requires revision reason
      if (nextSeq >= 2 && stage === "revision") {
        const reason = String(input.revisionReason || input.changeSummary || "").trim();
        if (!reason) throw new Error("REVISION_REASON_REQUIRED");
      }

      // Content checksum
      const canonicalJson = JSON.stringify(content, Object.keys(content).sort());
      const contentChecksum = createHash("sha256").update(canonicalJson).digest("hex");

      // Confidence
      let confidence = input.confidence !== undefined && input.confidence !== null ? Number(input.confidence) : null;
      if (confidence !== null && (isNaN(confidence) || confidence < 1 || confidence > 5)) {
        throw new Error("INVALID_CONFIDENCE");
      }

      const changeSource = input.changeSource ? String(input.changeSource).slice(0, 50) : (stage === "initial" ? "initial_response" : "self");
      const changeSummary = String(input.changeSummary || input.revisionReason || "").trim();
      const revisionReason = String(input.revisionReason || "").trim();

      // Insert immutable version
      const insertVer = await client.query(`
        INSERT INTO portfolio_versions(
          portfolio_id, version_number, content_json, change_summary,
          created_by, word_count, sequence_no, stage, confidence,
          change_source, revision_reason, previous_version_id, content_checksum, submission_key
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, submitted_at
      `, [
        portfolio.id, versionNumber, content, changeSummary,
        user.id, wordCount(content), nextSeq, stage, confidence,
        changeSource, revisionReason, prevVersion?.id || null, contentChecksum, submissionKey
      ]);
      const newVersion = insertVer.rows[0];

      // Link feedbacks if provided
      const linkedFeedbackIds = Array.isArray(input.linkedFeedbackIds) ? input.linkedFeedbackIds : [];
      if (linkedFeedbackIds.length > 0) {
        for (const fbId of linkedFeedbackIds) {
          await client.query(`
            INSERT INTO version_feedback_links(version_id, feedback_id, relation)
            VALUES($1, $2, 'prompted_revision')
            ON CONFLICT (version_id, feedback_id) DO NOTHING
          `, [newVersion.id, fbId]);
        }
        await client.query(`
          UPDATE feedbacks
          SET resolved = true, resolved_at = now(), resolved_by_version_id = $1
          WHERE id = ANY($2::uuid[]) AND portfolio_id = $3
        `, [newVersion.id, linkedFeedbackIds, portfolio.id]);
      }

      // Update portfolio status
      await client.query(`
        UPDATE portfolios
        SET active_version = $2, status = 'submitted_waiting_ai', updated_at = now()
        WHERE id = $1
      `, [portfolio.id, versionNumber]);

      // Create AI Review Request for THIS version (EVERY SUBMITTED VERSION GETS EXACTLY ONE AI QUEUE REQUEST)
      const aiPrompt = isPrediction
        ? "Nhận xét dự đoán trước đọc: Đánh giá quan sát ban đầu, logic lập luận, câu hỏi tò mò và mức tự tin của học sinh mà KHÔNG tiết lộ trước cốt truyện hoặc đáp án tác phẩm."
        : "Phản hồi bài viết theo 6 trục thi pháp. Chỉ ra điểm mạnh, điểm cần cải thiện có dẫn chứng và gợi ý bước tiếp theo.";

      await client.query(`
        INSERT INTO ai_review_requests(portfolio_id, version_id, prompt, stage)
        VALUES($1, $2, $3, $4)
        ON CONFLICT (version_id) DO NOTHING
      `, [portfolio.id, newVersion.id, aiPrompt, stage]);

      await auditWithClient(client, user, "STUDENT_SUBMIT_VERSION", "portfolio", portfolio.id, null, {
        versionId: newVersion.id,
        versionNumber,
        sequenceNo: nextSeq,
        stage
      }, req);

      await client.query("COMMIT");

      return {
        ok: true,
        version: {
          id: newVersion.id,
          versionNumber,
          sequenceNo: nextSeq,
          stage,
          createdAt: newVersion.submitted_at
        },
        portfolioStatus: "submitted_waiting_ai"
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // 3. AI COMPLETE REVIEW (AI saves proposal - DO NOT SEND DIRECTLY TO STUDENT)
  if (action === "ai_complete_review") {
    if (!["ai", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
    const review = await pool.query(`
      SELECT ar.*, p.student_id, a.public_id assignment_id, v.version_number
      FROM ai_review_requests ar
      JOIN portfolios p ON p.id = ar.portfolio_id
      JOIN assignments a ON a.id = p.assignment_id
      JOIN portfolio_versions v ON v.id = ar.version_id
      WHERE ar.id = $1
    `, [String(input.reviewId)]);
    const row = review.rows[0];
    if (!row) throw new Error("AI_REVIEW_NOT_FOUND");
    const response = String(input.response || "").trim();
    if (!response) throw new Error("EMPTY_RESPONSE");

    // Save proposal to AI review request only! DO NOT INSERT FEEDBACK!
    await pool.query(`
      UPDATE ai_review_requests
      SET status = 'completed', response = $2, reviewer_id = $3, completed_at = now(), teacher_review_status = 'pending'
      WHERE id = $1
    `, [row.id, response, user.id]);

    await pool.query(`
      UPDATE portfolios
      SET status = 'ai_proposed_waiting_teacher', updated_at = now()
      WHERE id = $1
    `, [row.portfolio_id]);

    await audit(pool, user, "AI_PROPOSAL_COMPLETED", "ai_review", row.id, null, { studentId: row.student_id }, req);
    return { ok: true };
  }

  // 4. TEACHER REVIEW AI (Teacher finalizes AI review: approved / revised / rejected -> creates FINAL teacher feedback)
  if (action === "teacher_review_ai") {
    if (!["teacher", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Lock review request
      const rRes = await client.query(`
        SELECT ar.*, p.student_id, p.id as portfolio_id, a.id as assignment_id, a.class_id, a.public_id as assignment_public_id, v.version_number
        FROM ai_review_requests ar
        JOIN portfolios p ON p.id = ar.portfolio_id
        JOIN assignments a ON a.id = p.assignment_id
        JOIN portfolio_versions v ON v.id = ar.version_id
        WHERE ar.id = $1
        FOR UPDATE OF ar
      `, [String(input.reviewId)]);
      const row = rRes.rows[0];
      if (!row) throw new Error("AI_REVIEW_NOT_FOUND");
      if (row.status !== "completed") throw new Error("AI_REVIEW_NOT_COMPLETED");

      // Check teacher class membership
      if (user.role !== "admin") {
        const memberCheck = await client.query(`
          SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2 AND member_role = 'teacher'
        `, [row.class_id, user.id]);
        if (memberCheck.rows.length === 0) throw new Error("TEACHER_CLASS_FORBIDDEN");
      }

      const decision = String(input.decision || input.status || "");
      if (!["approved", "revised", "rejected"].includes(decision)) throw new Error("INVALID_STATUS");

      let finalResponse = "";
      if (decision === "approved") {
        finalResponse = String(input.finalResponse || row.response || "").trim();
      } else if (decision === "revised") {
        finalResponse = String(input.finalResponse || "").trim();
        if (!finalResponse) throw new Error("REVISED_RESPONSE_REQUIRED");
      } else if (decision === "rejected") {
        finalResponse = String(input.finalResponse || "").trim();
      }

      // Update AI review request record
      await client.query(`
        UPDATE ai_review_requests
        SET teacher_review_status = $2,
            final_response = $3,
            teacher_id = $4,
            teacher_reviewed_at = now(),
            teacher_note = $5
        WHERE id = $1
      `, [row.id, decision, finalResponse, user.id, String(input.teacherNote || input.note || "")]);

      // If finalResponse is provided, create FINAL teacher feedback
      if (finalResponse) {
        const axisId = String(input.axisId || "form_argument");
        await client.query(`
          INSERT INTO feedbacks(portfolio_id, version_id, axis_id, selected_snippet, comment, author_id, author_role, source_ai_review_id)
          VALUES($1, $2, $3, $4, $5, $6, 'teacher', $7)
        `, [row.portfolio_id, row.version_id, axisId, String(input.selectedSnippet || ""), finalResponse, user.id, row.id]);

        await client.query(`
          UPDATE portfolios SET status = 'feedback_received', updated_at = now() WHERE id = $1
        `, [row.portfolio_id]);
      }

      await auditWithClient(client, user, "TEACHER_FINALIZE_AI_REVIEW", "ai_review", row.id, null, {
        decision,
        hasFinalResponse: Boolean(finalResponse)
      }, req);

      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // 5. ADD FEEDBACK (Teacher / Peer creates direct anchored feedback)
  if (action === "add_feedback") {
    if (!["teacher", "peer", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
    const studentId = String(input.studentId || "");
    const portfolio = await portfolioByPublicIds(pool, String(input.assignmentId), studentId);
    if (!portfolio) throw new Error("PORTFOLIO_NOT_FOUND");

    // Teacher class check
    if (user.role === "teacher") {
      const check = await pool.query(
        "SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2 AND member_role = 'teacher'",
        [portfolio.class_id, user.id]
      );
      if (check.rows.length === 0) throw new Error("TEACHER_CLASS_FORBIDDEN");
    }

    // Peer scope check
    if (user.role === "peer") {
      const check = await pool.query(
        "SELECT 1 FROM peer_review_assignments WHERE assignment_id = $1 AND student_id = $2 AND reviewer_id = $3",
        [portfolio.assignment_id, portfolio.student_id, user.id]
      );
      if (check.rows.length === 0) throw new Error("PEER_ASSIGNMENT_FORBIDDEN");
    }

    // Version validation (version_id must NOT be null in new flow)
    const versionQuery = input.versionId
      ? await pool.query("SELECT id FROM portfolio_versions WHERE portfolio_id = $1 AND id = $2", [portfolio.id, input.versionId])
      : await pool.query("SELECT id FROM portfolio_versions WHERE portfolio_id = $1 AND version_number = $2", [portfolio.id, String(input.versionNumber)]);
    const version = versionQuery.rows[0];
    if (!version) throw new Error("VERSION_NOT_FOUND");

    const role = user.role === "admin" ? "teacher" : user.role;
    const inserted = await pool.query(`
      INSERT INTO feedbacks(portfolio_id, version_id, axis_id, selected_snippet, comment, author_id, author_role)
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [portfolio.id, version.id, String(input.axisId), String(input.selectedSnippet || ""), String(input.comment || ""), user.id, role]);

    await pool.query("UPDATE portfolios SET status = 'feedback_received', updated_at = now() WHERE id = $1", [portfolio.id]);
    await audit(pool, user, "ADD_FEEDBACK", "portfolio", portfolio.id, null, { feedbackId: inserted.rows[0].id }, req);
    return { ok: true, id: inserted.rows[0].id, createdAt: inserted.rows[0].created_at };
  }

  // 6. RESOLVE FEEDBACK
  if (action === "resolve_feedback") {
    const existing = await pool.query(`
      SELECT f.*, p.student_id FROM feedbacks f JOIN portfolios p ON p.id = f.portfolio_id WHERE f.id = $1
    `, [String(input.feedbackId)]);
    const row = existing.rows[0];
    if (!row) throw new Error("FEEDBACK_NOT_FOUND");
    if (user.role !== "admin" && row.student_id !== user.id) throw new Error("FORBIDDEN");
    await pool.query("UPDATE feedbacks SET resolved = true, resolved_at = now() WHERE id = $1", [row.id]);
    await audit(pool, user, "RESOLVE_FEEDBACK", "feedback", row.id, null, { resolved: true }, req);
    return { ok: true };
  }

  // 7. SUBMIT RUBRIC
  if (action === "submit_rubric") {
    if (!["student", "teacher", "peer", "admin"].includes(user.role)) throw new Error("FORBIDDEN");

    const targetStudentId = String(input.studentId || user.id);
    // Student RBAC: Student can ONLY evaluate their own portfolio
    if (user.role === "student" && targetStudentId !== user.id) {
      throw new Error("FORBIDDEN_STUDENT_RUBRIC");
    }

    const portfolio = await portfolioByPublicIds(pool, String(input.assignmentId), targetStudentId);
    if (!portfolio) throw new Error("PORTFOLIO_NOT_FOUND");

    // Teacher class scope check
    if (user.role === "teacher") {
      const check = await pool.query(
        "SELECT 1 FROM class_members WHERE class_id = $1 AND user_id = $2 AND member_role = 'teacher'",
        [portfolio.class_id, user.id]
      );
      if (check.rows.length === 0) throw new Error("TEACHER_CLASS_FORBIDDEN");
    }

    // Peer scope check
    if (user.role === "peer") {
      const check = await pool.query(
        "SELECT 1 FROM peer_review_assignments WHERE assignment_id = $1 AND student_id = $2 AND reviewer_id = $3",
        [portfolio.assignment_id, portfolio.student_id, user.id]
      );
      if (check.rows.length === 0) throw new Error("PEER_ASSIGNMENT_FORBIDDEN");
    }

    // Version validation
    const versionQuery = input.versionId
      ? await pool.query("SELECT id FROM portfolio_versions WHERE portfolio_id = $1 AND id = $2", [portfolio.id, input.versionId])
      : await pool.query("SELECT id FROM portfolio_versions WHERE portfolio_id = $1 AND version_number = $2", [portfolio.id, String(input.versionNumber)]);
    const version = versionQuery.rows[0];
    if (!version) throw new Error("VERSION_NOT_FOUND");

    const evaluatorRole = user.role === "admin" ? "teacher" : user.role;
    const inserted = await pool.query(`
      INSERT INTO rubric_submissions(portfolio_id, version_id, evaluator_id, evaluator_role, criterion_scores, overall_feedback, total_score, max_score)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, submitted_at
    `, [
      portfolio.id, version.id, user.id, evaluatorRole,
      input.criterionScores || {}, String(input.overallFeedback || ""),
      Number(input.totalScore || 0), Number(input.maxScore || 0)
    ]);

    await audit(pool, user, "SUBMIT_RUBRIC", "portfolio", portfolio.id, null, { submissionId: inserted.rows[0].id }, req);
    return { ok: true, id: inserted.rows[0].id, submittedAt: inserted.rows[0].submitted_at };
  }

  // 8. CREATE ASSIGNMENT
  if (action === "create_assignment") {
    if (!["teacher", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const publicId = String(input.id || `assign-${Date.now()}`);
      const classCode = String(input.classId || "11A1");

      // Verify teacher class membership
      if (user.role === "teacher") {
        const check = await client.query(`
          SELECT c.id FROM classes c
          JOIN class_members cm ON cm.class_id = c.id AND cm.user_id = $1 AND cm.member_role = 'teacher'
          WHERE c.code = $2
        `, [user.id, classCode]);
        if (check.rows.length === 0) throw new Error("TEACHER_CLASS_FORBIDDEN");
      }

      const result = await client.query(`
        INSERT INTO assignments(
          public_id, class_id, text_id, rubric_id, title, assigned_at, deadline,
          difficulty, target_axes, prompt, guiding_steps, starter_template, status,
          ai_guidance, common_mistakes, reference_guide, prediction_template, workflow_config,
          created_by
        )
        SELECT $1, c.id, t.id, r.id, $2, now(), $3, $4, $5, $6, $7, $8, 'published',
               $9, $10, $11, $12, $13, $14
        FROM classes c, literature_texts t, rubrics r
        WHERE c.code = $15 AND t.public_id = $16 AND r.public_id = $17
        RETURNING id
      `, [
        publicId, String(input.title), input.deadline || null, String(input.difficulty || "Cơ bản"),
        input.targetAxes || AXES, String(input.prompt || ""), JSON.stringify(input.guidingSteps || []),
        JSON.stringify(input.starterTemplate || {}),
        String(input.aiGuidance || ""), String(input.commonMistakes || ""), String(input.referenceGuide || ""),
        JSON.stringify(input.predictionTemplate || {}), JSON.stringify(input.workflowConfig || {}),
        user.id, classCode, String(input.textId || "vo-nhat"), String(input.rubricId || "rubric-poetics-std")
      ]);
      if (!result.rows[0]) throw new Error("ASSIGNMENT_REFERENCE_NOT_FOUND");
      const assignmentDbId = result.rows[0].id;

      // Create portfolios and drafts for students in this class in the same transaction
      await client.query(`
        INSERT INTO portfolios(assignment_id, student_id)
        SELECT $1, user_id FROM class_members
        WHERE class_id = (SELECT class_id FROM assignments WHERE id = $1) AND member_role = 'student'
        ON CONFLICT DO NOTHING
      `, [assignmentDbId]);

      await client.query(`
        INSERT INTO portfolio_drafts(portfolio_id, content_json, updated_by)
        SELECT id, $1::jsonb, student_id FROM portfolios
        WHERE assignment_id = $2
        ON CONFLICT(portfolio_id) DO NOTHING
      `, [JSON.stringify(emptyDraft()), assignmentDbId]);

      await auditWithClient(client, user, "CREATE_ASSIGNMENT", "assignment", publicId, null, { title: input.title }, req);
      await client.query("COMMIT");
      return { ok: true, id: publicId };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // 9. ASSIGN PEER REVIEW
  if (action === "assign_peer_review") {
    if (!["teacher", "admin"].includes(user.role)) throw new Error("FORBIDDEN");
    const { assignmentId, reviewerId, studentId, versionId } = input;
    if (!assignmentId || !reviewerId || !studentId) throw new Error("VALIDATION_ERROR");
    if (reviewerId === studentId) throw new Error("CANNOT_PEER_REVIEW_SELF");

    const assignRes = await pool.query("SELECT id FROM assignments WHERE public_id = $1", [String(assignmentId)]);
    if (!assignRes.rows[0]) throw new Error("ASSIGNMENT_NOT_FOUND");

    const result = await pool.query(`
      INSERT INTO peer_review_assignments(assignment_id, reviewer_id, student_id, version_id)
      VALUES($1, $2, $3, $4)
      ON CONFLICT(assignment_id, reviewer_id, student_id)
      DO UPDATE SET version_id = EXCLUDED.version_id, status = 'pending'
      RETURNING id
    `, [assignRes.rows[0].id, reviewerId, studentId, versionId || null]);

    await audit(pool, user, "ASSIGN_PEER_REVIEW", "peer_review", result.rows[0].id, null, { reviewerId, studentId }, req);
    return { ok: true, id: result.rows[0].id };
  }

  throw new Error("UNKNOWN_ACTION");
}

export async function academicHealth() {
  await ensureAcademicSchema();
  const p = await getPool();
  const result = await p.query(`
    SELECT
      (SELECT count(*)::int FROM assignments) assignments,
      (SELECT count(*)::int FROM portfolios) portfolios,
      (SELECT count(*)::int FROM portfolio_versions) versions,
      (SELECT count(*)::int FROM ai_review_requests) ai_reviews
  `);
  return result.rows[0];
}
