/// <reference types="node" />
import { authenticate, send } from "../auth/auth.js";
import { getPool } from "../_lib/db.js";

const allowedRoles = new Set(["student","teacher","peer","researcher","admin","ai"]);
const allowedStatus = new Set(["active","locked"]);
const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const one = (value: unknown) => Array.isArray(value) ? value[0] : value;
const clean = (value: unknown, max = 160) => String(one(value) ?? "").trim().slice(0, max);

function pageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

async function listUsers(db: any, query: any) {
  const page = clampInt(query?.page, 1, 100000, 1);
  const pageSize = clampInt(query?.pageSize, 10, 100, 30);
  const q = clean(query?.q, 160);
  const role = clean(query?.role, 40);
  const status = clean(query?.status, 40);
  const classCode = clean(query?.classCode, 30).toUpperCase();

  const filters: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    filters.push(sql.replace("?", `$${params.length}`));
  };

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const p = `$${params.length}`;
    filters.push(`(
      lower(u.name) LIKE ${p}
      OR lower(u.email) LIKE ${p}
      OR lower(COALESCE(u.profile_json->>'studentCode','')) LIKE ${p}
      OR lower(COALESCE(u.profile_json->>'staffCode','')) LIKE ${p}
      OR lower(COALESCE(u.profile_json->>'phone','')) LIKE ${p}
    )`);
  }
  if (role && allowedRoles.has(role)) add("u.role=?", role);
  if (status && allowedStatus.has(status)) add("u.account_status=?", status);
  if (classCode) {
    params.push(classCode);
    filters.push(`EXISTS (
      SELECT 1
      FROM class_members cmf
      JOIN classes cf ON cf.id=cmf.class_id
      WHERE cmf.user_id=u.id AND cf.code=$${params.length}
    )`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const countResult = await db.query(`SELECT count(*)::int AS total FROM app_users u ${where}`, params);
  const total = Number(countResult.rows[0]?.total || 0);

  params.push(pageSize, (page - 1) * pageSize);
  const limitParam = `$${params.length - 1}`;
  const offsetParam = `$${params.length}`;
  const result = await db.query(`
    SELECT
      u.id,u.email,u.name,u.role,u.account_status,u.must_change_password,u.created_at,u.updated_at,u.last_login,u.profile_json,
      COALESCE(cls.class_names, ARRAY[]::text[]) AS class_names,
      COALESCE(cls.class_codes, ARRAY[]::text[]) AS class_codes
    FROM app_users u
    LEFT JOIN LATERAL (
      SELECT
        array_agg(DISTINCT c.name ORDER BY c.name) AS class_names,
        array_agg(DISTINCT c.code ORDER BY c.code) AS class_codes
      FROM class_members cm
      JOIN classes c ON c.id=cm.class_id
      WHERE cm.user_id=u.id
    ) cls ON true
    ${where}
    ORDER BY u.created_at DESC,u.email ASC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `, params);

  return {
    users: result.rows.map((row: any) => ({
      ...row,
      class_name: (row.class_codes || []).join(", ")
    })),
    pagination: pageMeta(page, pageSize, total),
    filters: { q, role, status, classCode }
  };
}

async function listClasses(db: any, query: any) {
  const page = clampInt(query?.page, 1, 100000, 1);
  const pageSize = clampInt(query?.pageSize, 10, 100, 30);
  const q = clean(query?.q, 120);
  const schoolYear = clean(query?.schoolYear, 20);

  const filters: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const p = `$${params.length}`;
    filters.push(`(lower(c.code) LIKE ${p} OR lower(c.name) LIKE ${p})`);
  }
  if (schoolYear) {
    params.push(schoolYear);
    filters.push(`c.school_year=$${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const count = Number((await db.query(`SELECT count(*)::int total FROM classes c ${where}`, params)).rows[0]?.total || 0);
  params.push(pageSize, (page - 1) * pageSize);

  const result = await db.query(`
    SELECT
      c.id,c.code,c.name,c.school_year,c.created_at,c.updated_at,
      count(cm.user_id) FILTER (WHERE cm.member_role='student')::int AS student_count,
      count(cm.user_id) FILTER (WHERE cm.member_role='teacher')::int AS teacher_count,
      count(DISTINCT a.id)::int AS assignment_count
    FROM classes c
    LEFT JOIN class_members cm ON cm.class_id=c.id
    LEFT JOIN assignments a ON a.class_id=c.id
    ${where}
    GROUP BY c.id,c.code,c.name,c.school_year,c.created_at,c.updated_at
    ORDER BY c.school_year DESC,c.code ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return { classes: result.rows, pagination: pageMeta(page, pageSize, count), filters: { q, schoolYear } };
}

async function listClassMembers(db: any, query: any) {
  const classCode = clean(query?.classCode, 30).toUpperCase();
  if (!classCode) return { class: null, members: [] };
  const classRow = (await db.query(
    `SELECT id,code,name,school_year FROM classes WHERE code=$1 LIMIT 1`,
    [classCode]
  )).rows[0] || null;
  if (!classRow) return { class: null, members: [] };

  const rows = await db.query(`
    SELECT u.id,u.name,u.email,u.role,u.account_status,u.profile_json,cm.member_role,cm.joined_at
    FROM class_members cm
    JOIN app_users u ON u.id=cm.user_id
    WHERE cm.class_id=$1
    ORDER BY cm.member_role DESC,u.name ASC
  `, [classRow.id]);
  return { class: classRow, members: rows.rows };
}

async function listAudit(db: any, query: any) {
  const page = clampInt(query?.page, 1, 100000, 1);
  const pageSize = clampInt(query?.pageSize, 10, 100, 50);
  const q = clean(query?.q, 160);
  const action = clean(query?.action, 120);
  const targetType = clean(query?.targetType, 80);

  const filters: string[] = [];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const p = `$${params.length}`;
    filters.push(`(
      lower(COALESCE(actor.name,'')) LIKE ${p}
      OR lower(COALESCE(actor.email,'')) LIKE ${p}
      OR lower(l.action) LIKE ${p}
      OR lower(l.target_id) LIKE ${p}
    )`);
  }
  if (action) {
    params.push(action);
    filters.push(`l.action=$${params.length}`);
  }
  if (targetType) {
    params.push(targetType);
    filters.push(`l.target_type=$${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const total = Number((await db.query(`
    SELECT count(*)::int total
    FROM audit_logs l
    LEFT JOIN app_users actor ON actor.id=l.actor_id
    ${where}
  `, params)).rows[0]?.total || 0);

  params.push(pageSize, (page - 1) * pageSize);
  const rows = await db.query(`
    SELECT
      l.id,l.created_at AS timestamp,l.actor_role,l.action,l.target_type,l.target_id,l.ip_address,
      l.before_json,l.after_json,
      COALESCE(actor.name,'Hệ thống') AS actor_name,
      actor.email AS actor_email
    FROM audit_logs l
    LEFT JOIN app_users actor ON actor.id=l.actor_id
    ${where}
    ORDER BY l.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    logs: rows.rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      actorEmail: row.actor_email,
      action: row.action,
      target: `${row.target_type}:${row.target_id}`,
      targetType: row.target_type,
      targetId: row.target_id,
      ipAddress: row.ip_address,
      before: row.before_json,
      after: row.after_json
    })),
    pagination: pageMeta(page, pageSize, total)
  };
}

async function getStats(db: any) {
  const result = await db.query(`
    SELECT
      (SELECT count(*)::int FROM app_users) AS users,
      (SELECT count(*)::int FROM app_users WHERE role='student') AS students,
      (SELECT count(*)::int FROM app_users WHERE role='teacher') AS teachers,
      (SELECT count(*)::int FROM app_users WHERE account_status='locked') AS locked_users,
      (SELECT count(*)::int FROM classes) AS classes,
      (SELECT count(*)::int FROM class_members) AS memberships,
      (SELECT count(*)::int FROM audit_logs) AS audit_events
  `);
  return { stats: result.rows[0] || {} };
}

export default async function handler(req:any,res:any) {
  if (req.method !== "GET") return send(res,405,{code:"METHOD_NOT_ALLOWED"});
  res.setHeader("Cache-Control","private, no-store");
  try {
    const actor = await authenticate(req);
    if (!actor) return send(res,401,{code:"UNAUTHENTICATED"});
    if (actor.role !== "admin") return send(res,403,{code:"FORBIDDEN"});

    const db = await getPool();
    const scope = clean(req.query?.scope, 40) || "users";
    if (scope === "users") return send(res,200,await listUsers(db,req.query));
    if (scope === "classes") return send(res,200,await listClasses(db,req.query));
    if (scope === "class-members") return send(res,200,await listClassMembers(db,req.query));
    if (scope === "audit") return send(res,200,await listAudit(db,req.query));
    if (scope === "stats") return send(res,200,await getStats(db));
    return send(res,400,{code:"INVALID_SCOPE",message:"Phạm vi quản trị không hợp lệ."});
  } catch(error:any) {
    console.error('[admin/users]', { code: String(error?.message || 'ADMIN_USERS_ERROR'), route: '/api/admin/users' });
    return send(res,500,{code:"ADMIN_USERS_ERROR",message:"Không thể tải dữ liệu quản trị."});
  }
}
