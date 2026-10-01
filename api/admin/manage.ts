/// <reference types="node" />
import { randomBytes, scryptSync } from 'node:crypto';
import { assertSameOrigin, authenticate, body, send } from '../auth/auth.js';
import { emptyDraft } from '../_lib/academic-core.js';
import { getPool } from '../_lib/db.js';

const allowedRoles = ['student', 'teacher', 'peer', 'researcher', 'admin', 'ai'];
const allowedStatus = ['active', 'locked'];
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const cleanText = (value: unknown, max = 240) => String(value ?? '').trim().slice(0, max);
const cleanProfile = (input: any = {}, current: any = {}) => {
  const merged = { ...(current || {}), ...(input && typeof input === 'object' && !Array.isArray(input) ? input : {}) };
  const dateOfBirth = cleanText(merged.dateOfBirth, 10);
  const list = (value: unknown) => {
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[\n,]/);
    return [...new Set(values.map(item => cleanText(item, 80)).filter(Boolean))].slice(0, 12);
  };
  return {
    phone: cleanText(merged.phone, 30),
    dateOfBirth: /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? dateOfBirth : '',
    school: cleanText(merged.school, 160),
    schoolYear: cleanText(merged.schoolYear, 20),
    grade: cleanText(merged.grade, 30),
    studentCode: cleanText(merged.studentCode, 50),
    staffCode: cleanText(merged.staffCode, 50),
    department: cleanText(merged.department, 120),
    bio: cleanText(merged.bio, 600),
    learningGoal: cleanText(merged.learningGoal, 600),
    favoriteGenres: list(merged.favoriteGenres),
    favoriteAuthors: list(merged.favoriteAuthors),
    favoriteWorks: list(merged.favoriteWorks)
  };
};

const hash = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

async function audit(p: any, user: any, action: string, targetType: string, targetId: string, before: any, after: any, req: any) {
  const ip = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 100);
  await p.query(`
    INSERT INTO audit_logs(actor_id, actor_role, action, target_type, target_id, before_json, after_json, ip_address)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)
  `, [user.id, user.role, action, targetType, targetId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, ip]);
}

async function provisionStudentForClass(client: any, userId: string, classId: string) {
  await client.query(`
    INSERT INTO portfolios(assignment_id,student_id,active_version)
    SELECT a.id,$1,'Bản nháp'
    FROM assignments a
    WHERE a.class_id=$2 AND a.status='published'
    ON CONFLICT(assignment_id,student_id) DO NOTHING
  `, [userId, classId]);
  await client.query(`
    INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
    SELECT p.id,$3::jsonb,$1
    FROM portfolios p
    WHERE p.student_id=$1
      AND p.assignment_id IN (SELECT id FROM assignments WHERE class_id=$2)
    ON CONFLICT(portfolio_id) DO NOTHING
  `, [userId, classId, JSON.stringify(emptyDraft())]);
}

const normalizeImportRow = (raw: any, index: number) => {
  const role = cleanText(raw?.role || 'student', 40).toLowerCase();
  const email = cleanText(raw?.email, 240).toLowerCase();
  const name = cleanText(raw?.name, 160);
  const classCode = cleanText(raw?.classCode, 30).toUpperCase();
  const profile = cleanProfile({
    phone: raw?.phone,
    dateOfBirth: raw?.dateOfBirth,
    school: raw?.school,
    schoolYear: raw?.schoolYear,
    grade: raw?.grade,
    studentCode: raw?.studentCode,
    staffCode: raw?.staffCode,
    department: raw?.department
  });
  const errors: string[] = [];
  if (name.length < 2) errors.push('INVALID_NAME');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('INVALID_EMAIL');
  if (!allowedRoles.includes(role)) errors.push('INVALID_ROLE');
  if (classCode && !['student','teacher'].includes(role)) errors.push('ROLE_MISMATCH');
  return { index, name, email, role, classCode, profile, errors };
};

const uniqueUuidList = (value: unknown, max = 200) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item || '')).filter(item => uuidRe.test(item)))].slice(0, max);
};

const safeError = (code: string) => {
  if (code === 'CSRF_ORIGIN_MISMATCH') return 'Yêu cầu không hợp lệ.';
  if (code === 'SELF_LOCKOUT_BLOCKED') return 'Không thể tự hạ quyền hoặc khóa tài khoản admin đang dùng.';
  if (code === 'ROLE_MISMATCH') return 'Vai trò tài khoản không khớp vai trò thành viên lớp.';
  if (code === 'ROLE_CHANGE_HAS_ACADEMIC_HISTORY') return 'Không thể đổi vai trò học sinh khi tài khoản đã có hồ sơ học tập. Hãy giữ vai trò học sinh để bảo toàn lịch sử.';
  if (code === 'MEMBERSHIP_HAS_HISTORY') return 'Không thể gỡ học sinh khỏi lớp vì đã có phiên bản bài nộp trong lớp này.';
  if (code === 'IMPORT_TOO_LARGE') return 'Mỗi lần chỉ nhập tối đa 300 tài khoản.';
  if (code.includes('NOT_FOUND')) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (code.startsWith('INVALID') || code === 'VALIDATION_ERROR') return 'Dữ liệu quản trị không hợp lệ.';
  return 'Không thể hoàn tất thao tác quản trị.';
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return send(res, 405, { code: 'METHOD_NOT_ALLOWED' });
  try {
    assertSameOrigin(req);
    const user = await authenticate(req);
    if (!user) return send(res, 401, { code: 'UNAUTHENTICATED' });
    if (user.role !== 'admin') return send(res, 403, { code: 'FORBIDDEN' });

    const pool = await getPool();
    const input = body(req);
    const action = String(input.action || '');

    if (action === 'create_user') {
      const email = cleanText(input.email, 240).toLowerCase();
      const name = cleanText(input.name, 160);
      const role = cleanText(input.role || 'student', 40);
      const classCode = cleanText(input.classCode, 30).toUpperCase();
      const profile = cleanProfile(input.profile);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !allowedRoles.includes(role)) {
        return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      }
      if (classCode && !['student', 'teacher'].includes(role)) {
        return send(res, 400, { code: 'ROLE_MISMATCH', message: safeError('ROLE_MISMATCH') });
      }
      const temp = `HTNV-${randomBytes(9).toString('base64url')}!9`;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        let classRow: any = null;
        if (classCode) {
          classRow = (await client.query('SELECT id,code FROM classes WHERE code=$1 FOR UPDATE', [classCode])).rows[0] || null;
          if (!classRow) {
            await client.query('ROLLBACK');
            return send(res, 404, { code: 'CLASS_NOT_FOUND', message: safeError('CLASS_NOT_FOUND') });
          }
        }
        const result = await client.query(`
          INSERT INTO app_users(email,name,role,password_hash,must_change_password,account_status,profile_json)
          VALUES($1,$2,$3,$4,true,'active',$5::jsonb)
          RETURNING id,email,name,role,account_status,must_change_password,created_at,last_login,profile_json
        `, [email, name, role, hash(temp), JSON.stringify(profile)]);

        if (classRow) {
          await client.query(`
            INSERT INTO class_members(class_id,user_id,member_role)
            VALUES($1,$2,$3)
            ON CONFLICT(class_id,user_id) DO UPDATE SET member_role=EXCLUDED.member_role
          `, [classRow.id, result.rows[0].id, role]);
          if (role === 'student') {
            await client.query(`
              INSERT INTO portfolios(assignment_id,student_id,active_version)
              SELECT a.id,$1,'Bản nháp' FROM assignments a WHERE a.class_id=$2 AND a.status='published'
              ON CONFLICT(assignment_id,student_id) DO NOTHING
            `, [result.rows[0].id, classRow.id]);
            await client.query(`
              INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
              SELECT p.id,$3::jsonb,$1 FROM portfolios p
              WHERE p.student_id=$1 AND p.assignment_id IN (SELECT id FROM assignments WHERE class_id=$2)
              ON CONFLICT(portfolio_id) DO NOTHING
            `, [result.rows[0].id, classRow.id, JSON.stringify(emptyDraft())]);
          }
        }

        await audit(client, user, 'ADMIN_CREATE_USER', 'user', result.rows[0].id, null, {
          role,
          accountStatus: 'active',
          mustChangePassword: true,
          classCode: classRow?.code || null,
          profileFields: Object.entries(profile).filter(([, value]) => Array.isArray(value) ? value.length : Boolean(value)).map(([key]) => key)
        }, req);
        await client.query('COMMIT');
        return send(res, 201, { user: { ...result.rows[0], class_name: classRow?.code || '' }, temporaryPassword: temp });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'update_user') {
      const targetId = String(input.userId || '');
      if (!uuidRe.test(targetId)) return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const beforeResult = await client.query(`
          SELECT id,email,name,role,account_status,must_change_password,profile_json FROM app_users WHERE id=$1 FOR UPDATE
        `, [targetId]);
        const before = beforeResult.rows[0];
        if (!before) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'USER_NOT_FOUND', message: safeError('USER_NOT_FOUND') });
        }
        const role = cleanText(input.role || before.role, 40);
        const status = cleanText(input.accountStatus || before.account_status, 40);
        const name = input.name === undefined ? before.name : cleanText(input.name, 160);
        const email = input.email === undefined ? before.email : cleanText(input.email, 240).toLowerCase();
        const profile = cleanProfile(input.profile, before.profile_json);
        if (!allowedRoles.includes(role) || !allowedStatus.includes(status) || name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await client.query('ROLLBACK');
          return send(res, 400, { code: 'INVALID_USER_STATE', message: safeError('INVALID_USER_STATE') });
        }
        if (targetId === user.id && (role !== 'admin' || status !== 'active')) {
          await client.query('ROLLBACK');
          return send(res, 400, { code: 'SELF_LOCKOUT_BLOCKED', message: safeError('SELF_LOCKOUT_BLOCKED') });
        }
        if (before.role === 'student' && role !== 'student') {
          const history = await client.query('SELECT 1 FROM portfolios WHERE student_id=$1 LIMIT 1', [targetId]);
          if (history.rows.length) {
            await client.query('ROLLBACK');
            return send(res, 409, { code: 'ROLE_CHANGE_HAS_ACADEMIC_HISTORY', message: safeError('ROLE_CHANGE_HAS_ACADEMIC_HISTORY') });
          }
        }

        const result = await client.query(`
          UPDATE app_users
          SET role=$2,account_status=$3,name=$4,email=$5,profile_json=$6::jsonb,updated_at=now()
          WHERE id=$1
          RETURNING id,email,name,role,account_status,must_change_password,created_at,last_login,profile_json
        `, [targetId, role, status, name, email, JSON.stringify(profile)]);
        if (role !== before.role) {
          if (role === 'student' || role === 'teacher') {
            await client.query('UPDATE class_members SET member_role=$2 WHERE user_id=$1', [targetId, role]);
          } else {
            await client.query('DELETE FROM class_members WHERE user_id=$1', [targetId]);
          }
          if (role === 'student') {
            await client.query(`
              INSERT INTO portfolios(assignment_id,student_id,active_version)
              SELECT a.id,$1,'Bản nháp'
              FROM assignments a
              JOIN class_members cm ON cm.class_id=a.class_id AND cm.user_id=$1 AND cm.member_role='student'
              WHERE a.status='published'
              ON CONFLICT(assignment_id,student_id) DO NOTHING
            `, [targetId]);
            await client.query(`
              INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
              SELECT p.id,$2::jsonb,$1 FROM portfolios p
              WHERE p.student_id=$1
              ON CONFLICT(portfolio_id) DO NOTHING
            `, [targetId, JSON.stringify(emptyDraft())]);
          }
        }
        await audit(client, user, 'ADMIN_UPDATE_USER', 'user', targetId,
          { role: before.role, accountStatus: before.account_status, name: before.name, email: before.email, mustChangePassword: before.must_change_password },
          {
            role,
            accountStatus: status,
            name,
            email,
            mustChangePassword: result.rows[0].must_change_password,
            profileFields: Object.entries(profile).filter(([, value]) => Array.isArray(value) ? value.length : Boolean(value)).map(([key]) => key)
          }, req);
        await client.query('COMMIT');
        return send(res, 200, { user: result.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'reset_password') {
      const targetId = String(input.userId || '');
      if (!uuidRe.test(targetId)) return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      const temp = `HTNV-${randomBytes(9).toString('base64url')}!9`;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const beforeResult = await client.query('SELECT id,role,account_status,must_change_password FROM app_users WHERE id=$1 FOR UPDATE', [targetId]);
        if (!beforeResult.rows[0]) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'USER_NOT_FOUND', message: safeError('USER_NOT_FOUND') });
        }
        await client.query(`
          UPDATE app_users SET password_hash=$2,must_change_password=true,updated_at=now() WHERE id=$1
        `, [targetId, hash(temp)]);
        await audit(client, user, 'ADMIN_RESET_PASSWORD', 'user', targetId,
          { mustChangePassword: beforeResult.rows[0].must_change_password }, { mustChangePassword: true }, req);
        await client.query('COMMIT');
        return send(res, 200, { temporaryPassword: temp, message: 'Mật khẩu tạm chỉ hiển thị một lần.' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'create_class') {
      const code = String(input.code || '').trim().toUpperCase().slice(0, 30);
      const name = String(input.name || '').trim().slice(0, 120);
      const schoolYear = String(input.schoolYear || '2026-2027').trim().slice(0, 20);
      if (!/^[A-Z0-9_-]{1,30}$/.test(code) || !name) return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const before = (await client.query('SELECT id,code,school_year FROM classes WHERE code=$1 FOR UPDATE', [code])).rows[0] || null;
        const result = await client.query(`
          INSERT INTO classes(code,name,school_year,created_by)
          VALUES($1,$2,$3,$4)
          ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,school_year=EXCLUDED.school_year,updated_at=now()
          RETURNING *
        `, [code, name, schoolYear, user.id]);
        await audit(client, user, 'ADMIN_SAVE_CLASS', 'class', result.rows[0].id,
          before ? { code: before.code, schoolYear: before.school_year } : null,
          { code, schoolYear }, req);
        await client.query('COMMIT');
        return send(res, 200, { class: result.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'assign_member') {
      const classCode = String(input.classCode || '').trim().toUpperCase().slice(0, 30);
      const targetId = String(input.userId || '');
      const memberRole = String(input.memberRole || 'student');
      if (!uuidRe.test(targetId) || !['student', 'teacher'].includes(memberRole)) {
        return send(res, 400, { code: 'INVALID_MEMBER_ROLE', message: safeError('INVALID_MEMBER_ROLE') });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const targetUser = (await client.query('SELECT id,role,account_status FROM app_users WHERE id=$1 FOR UPDATE', [targetId])).rows[0];
        if (!targetUser) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'USER_NOT_FOUND', message: safeError('USER_NOT_FOUND') });
        }
        if (targetUser.account_status !== 'active' || targetUser.role !== memberRole) {
          await client.query('ROLLBACK');
          return send(res, 400, { code: 'ROLE_MISMATCH', message: safeError('ROLE_MISMATCH') });
        }
        const classRow = (await client.query('SELECT id FROM classes WHERE code=$1 FOR UPDATE', [classCode])).rows[0];
        if (!classRow) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'CLASS_NOT_FOUND', message: safeError('CLASS_NOT_FOUND') });
        }
        await client.query(`
          INSERT INTO class_members(class_id,user_id,member_role)
          VALUES($1,$2,$3)
          ON CONFLICT(class_id,user_id) DO UPDATE SET member_role=EXCLUDED.member_role
        `, [classRow.id, targetId, memberRole]);

        if (memberRole === 'student') {
          await client.query(`
            INSERT INTO portfolios(assignment_id,student_id,active_version)
            SELECT a.id,$1,'Bản nháp' FROM assignments a WHERE a.class_id=$2 AND a.status='published'
            ON CONFLICT(assignment_id,student_id) DO NOTHING
          `, [targetId, classRow.id]);
          await client.query(`
            INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
            SELECT p.id,$3::jsonb,$1 FROM portfolios p
            WHERE p.student_id=$1 AND p.assignment_id IN (SELECT id FROM assignments WHERE class_id=$2)
            ON CONFLICT(portfolio_id) DO NOTHING
          `, [targetId, classRow.id, JSON.stringify(emptyDraft())]);
        }

        await audit(client, user, 'ADMIN_ASSIGN_CLASS', 'class_member', `${classCode}:${targetId}`, null,
          { classCode, userId: targetId, memberRole }, req);
        await client.query('COMMIT');
        return send(res, 200, { ok: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'update_class') {
      const classId = String(input.classId || '');
      const code = cleanText(input.code, 30).toUpperCase();
      const name = cleanText(input.name, 120);
      const schoolYear = cleanText(input.schoolYear || '2026-2027', 20);
      if (!uuidRe.test(classId) || !/^[A-Z0-9_-]{1,30}$/.test(code) || !name) {
        return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const before = (await client.query('SELECT id,code,name,school_year FROM classes WHERE id=$1 FOR UPDATE', [classId])).rows[0];
        if (!before) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'CLASS_NOT_FOUND', message: safeError('CLASS_NOT_FOUND') });
        }
        const result = await client.query(`
          UPDATE classes SET code=$2,name=$3,school_year=$4,updated_at=now()
          WHERE id=$1
          RETURNING id,code,name,school_year,created_at,updated_at
        `, [classId, code, name, schoolYear]);
        await audit(client, user, 'ADMIN_UPDATE_CLASS', 'class', classId,
          { code: before.code, name: before.name, schoolYear: before.school_year },
          { code, name, schoolYear }, req);
        await client.query('COMMIT');
        return send(res, 200, { class: result.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'remove_member') {
      const classCode = cleanText(input.classCode, 30).toUpperCase();
      const targetId = String(input.userId || '');
      if (!classCode || !uuidRe.test(targetId)) {
        return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const classRow = (await client.query('SELECT id,code FROM classes WHERE code=$1 FOR UPDATE', [classCode])).rows[0];
        if (!classRow) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'CLASS_NOT_FOUND', message: safeError('CLASS_NOT_FOUND') });
        }
        const member = (await client.query(`
          SELECT cm.member_role,u.name
          FROM class_members cm JOIN app_users u ON u.id=cm.user_id
          WHERE cm.class_id=$1 AND cm.user_id=$2
          FOR UPDATE
        `, [classRow.id, targetId])).rows[0];
        if (!member) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'MEMBERSHIP_NOT_FOUND', message: safeError('MEMBERSHIP_NOT_FOUND') });
        }
        if (member.member_role === 'student') {
          const history = await client.query(`
            SELECT 1
            FROM portfolio_versions v
            JOIN portfolios p ON p.id=v.portfolio_id
            JOIN assignments a ON a.id=p.assignment_id
            WHERE p.student_id=$1 AND a.class_id=$2
              AND v.change_source IS DISTINCT FROM 'simulation'
            LIMIT 1
          `, [targetId, classRow.id]);
          if (history.rows.length) {
            await client.query('ROLLBACK');
            return send(res, 409, { code: 'MEMBERSHIP_HAS_HISTORY', message: safeError('MEMBERSHIP_HAS_HISTORY') });
          }
          await client.query(`
            DELETE FROM portfolio_drafts d
            USING portfolios p, assignments a
            WHERE d.portfolio_id=p.id AND p.assignment_id=a.id
              AND p.student_id=$1 AND a.class_id=$2
          `, [targetId, classRow.id]);
          await client.query(`
            DELETE FROM portfolios p
            USING assignments a
            WHERE p.assignment_id=a.id AND p.student_id=$1 AND a.class_id=$2
          `, [targetId, classRow.id]);
        }
        await client.query('DELETE FROM class_members WHERE class_id=$1 AND user_id=$2', [classRow.id, targetId]);
        await audit(client, user, 'ADMIN_REMOVE_CLASS_MEMBER', 'class_member', `${classCode}:${targetId}`,
          { classCode, userId: targetId, memberRole: member.member_role, name: member.name }, null, req);
        await client.query('COMMIT');
        return send(res, 200, { ok: true });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'bulk_update_status') {
      const userIds = uniqueUuidList(input.userIds, 200);
      const status = cleanText(input.accountStatus, 40);
      if (!userIds.length || !allowedStatus.includes(status)) {
        return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      }
      if (status === 'locked' && userIds.includes(user.id)) {
        return send(res, 400, { code: 'SELF_LOCKOUT_BLOCKED', message: safeError('SELF_LOCKOUT_BLOCKED') });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const beforeRows = await client.query(
          'SELECT id,account_status FROM app_users WHERE id=ANY($1::uuid[]) FOR UPDATE',
          [userIds]
        );
        const result = await client.query(`
          UPDATE app_users SET account_status=$2,updated_at=now()
          WHERE id=ANY($1::uuid[])
          RETURNING id,email,name,role,account_status
        `, [userIds, status]);
        await audit(client, user, 'ADMIN_BULK_STATUS', 'user_batch', `count:${result.rowCount || 0}`,
          { statuses: beforeRows.rows.map((row: any) => ({ id: row.id, status: row.account_status })) },
          { accountStatus: status, userIds: result.rows.map((row: any) => row.id) }, req);
        await client.query('COMMIT');
        return send(res, 200, { updated: result.rows, count: result.rowCount || 0 });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'bulk_assign_class') {
      const userIds = uniqueUuidList(input.userIds, 200);
      const classCode = cleanText(input.classCode, 30).toUpperCase();
      const memberRole = cleanText(input.memberRole || 'student', 40);
      if (!userIds.length || !classCode || !['student','teacher'].includes(memberRole)) {
        return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const classRow = (await client.query('SELECT id,code FROM classes WHERE code=$1 FOR UPDATE', [classCode])).rows[0];
        if (!classRow) {
          await client.query('ROLLBACK');
          return send(res, 404, { code: 'CLASS_NOT_FOUND', message: safeError('CLASS_NOT_FOUND') });
        }
        const users = await client.query(`
          SELECT id,role,account_status,name
          FROM app_users
          WHERE id=ANY($1::uuid[])
          FOR UPDATE
        `, [userIds]);
        const valid = users.rows.filter((row: any) => row.role === memberRole && row.account_status === 'active');
        const skipped = users.rows.filter((row: any) => row.role !== memberRole || row.account_status !== 'active');
        for (const target of valid) {
          await client.query(`
            INSERT INTO class_members(class_id,user_id,member_role)
            VALUES($1,$2,$3)
            ON CONFLICT(class_id,user_id) DO UPDATE SET member_role=EXCLUDED.member_role
          `, [classRow.id, target.id, memberRole]);
          if (memberRole === 'student') await provisionStudentForClass(client, target.id, classRow.id);
        }
        await audit(client, user, 'ADMIN_BULK_ASSIGN_CLASS', 'class_member_batch', classCode, null,
          { classCode, memberRole, userIds: valid.map((row: any) => row.id), skipped: skipped.map((row: any) => row.id) }, req);
        await client.query('COMMIT');
        return send(res, 200, { assigned: valid.length, skipped: skipped.map((row: any) => ({ id: row.id, name: row.name, role: row.role, status: row.account_status })) });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    if (action === 'import_users') {
      const rawRows = Array.isArray(input.rows) ? input.rows.slice(0, 301) : [];
      const dryRun = input.dryRun !== false;
      if (!rawRows.length) return send(res, 400, { code: 'VALIDATION_ERROR', message: safeError('VALIDATION_ERROR') });
      if (rawRows.length > 300) return send(res, 400, { code: 'IMPORT_TOO_LARGE', message: safeError('IMPORT_TOO_LARGE') });

      const rows = rawRows.map((row: any, index: number) => normalizeImportRow(row, index));
      const emails = rows.map(row => row.email).filter(Boolean);
      const studentCodes = rows.map(row => row.profile.studentCode).filter(Boolean);
      const staffCodes = rows.map(row => row.profile.staffCode).filter(Boolean);
      const classCodes = [...new Set(rows.map(row => row.classCode).filter(Boolean))];

      const [existingEmailRows, existingCodeRows, classRows] = await Promise.all([
        pool.query('SELECT email FROM app_users WHERE lower(email)=ANY($1::text[])', [emails.map((value: string) => value.toLowerCase())]),
        pool.query(`
          SELECT profile_json->>'studentCode' student_code, profile_json->>'staffCode' staff_code
          FROM app_users
          WHERE (profile_json->>'studentCode')=ANY($1::text[])
             OR (profile_json->>'staffCode')=ANY($2::text[])
        `, [studentCodes.length ? studentCodes : [''], staffCodes.length ? staffCodes : ['']]),
        classCodes.length
          ? pool.query('SELECT id,code FROM classes WHERE code=ANY($1::text[])', [classCodes])
          : Promise.resolve({ rows: [] } as any)
      ]);

      const existingEmails = new Set(existingEmailRows.rows.map((row: any) => String(row.email).toLowerCase()));
      const existingCodes = new Set(existingCodeRows.rows.flatMap((row: any) => [row.student_code, row.staff_code]).filter(Boolean));
      const classMap = new Map<string, string>(classRows.rows.map((row: any) => [String(row.code), String(row.id)] as [string, string]));
      const seenEmails = new Set<string>();
      const seenCodes = new Set<string>();

      const preview = rows.map(row => {
        const errors = [...row.errors];
        const code = row.role === 'student' ? row.profile.studentCode : row.profile.staffCode;
        if (seenEmails.has(row.email)) errors.push('DUPLICATE_EMAIL_IN_FILE');
        if (row.email) seenEmails.add(row.email);
        if (code && seenCodes.has(code)) errors.push('DUPLICATE_CODE_IN_FILE');
        if (code) seenCodes.add(code);
        if (existingEmails.has(row.email)) errors.push('EMAIL_EXISTS');
        if (code && existingCodes.has(code)) errors.push('CODE_EXISTS');
        if (row.classCode && !classMap.has(row.classCode)) errors.push('CLASS_NOT_FOUND');
        return { ...row, errors, status: errors.length ? 'invalid' : 'ready' };
      });

      const summary = {
        total: preview.length,
        ready: preview.filter(row => row.status === 'ready').length,
        invalid: preview.filter(row => row.status !== 'ready').length
      };
      if (dryRun) return send(res, 200, { preview, summary });

      const ready = preview.filter(row => row.status === 'ready');
      const credentials: any[] = [];
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const row of ready) {
          const temp = `HTNV-${randomBytes(9).toString('base64url')}!9`;
          const inserted = (await client.query(`
            INSERT INTO app_users(email,name,role,password_hash,must_change_password,account_status,profile_json)
            VALUES($1,$2,$3,$4,true,'active',$5::jsonb)
            RETURNING id,email,name,role
          `, [row.email, row.name, row.role, hash(temp), JSON.stringify(row.profile)])).rows[0];
          if (row.classCode) {
            const classId = classMap.get(row.classCode);
            await client.query(`
              INSERT INTO class_members(class_id,user_id,member_role)
              VALUES($1,$2,$3)
              ON CONFLICT(class_id,user_id) DO UPDATE SET member_role=EXCLUDED.member_role
            `, [classId, inserted.id, row.role]);
            if (row.role === 'student') await provisionStudentForClass(client, inserted.id, classId);
          }
          credentials.push({ id: inserted.id, name: inserted.name, email: inserted.email, temporaryPassword: temp, classCode: row.classCode });
        }
        await audit(client, user, 'ADMIN_IMPORT_USERS', 'user_batch', `count:${credentials.length}`, null,
          { imported: credentials.length, skipped: summary.invalid, roles: ready.reduce((acc: any, row: any) => ({ ...acc, [row.role]: (acc[row.role] || 0) + 1 }), {}) }, req);
        await client.query('COMMIT');
        return send(res, 201, { imported: credentials.length, skipped: summary.invalid, credentials, preview, summary });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }

    return send(res, 400, { code: 'UNKNOWN_ACTION', message: 'Thao tác không hợp lệ.' });
  } catch (error: any) {
    const code = String(error?.message || 'ADMIN_ACTION_ERROR');
    if (String(error?.code) === '23505') return send(res, 409, { code: 'DUPLICATE', message: 'Dữ liệu đã tồn tại.' });
    const status = code === 'CSRF_ORIGIN_MISMATCH' || code === 'FORBIDDEN' ? 403 : code.includes('NOT_FOUND') ? 404 : 500;
    console.error('[admin/manage]', { code, status, route: '/api/admin/manage' });
    return send(res, status, { code: status === 500 ? 'ADMIN_ACTION_ERROR' : code, message: safeError(code) });
  }
}
