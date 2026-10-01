/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { authenticate, send } from '../auth/auth.js';
import { getStudentWorkspace } from '../_lib/student-resources.js';

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const requestId = String(req.headers?.['x-vercel-id'] || req.headers?.['x-request-id'] || randomUUID());
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Request-Id', requestId);

  if (req.method !== 'GET') return send(res, 405, { code: 'METHOD_NOT_ALLOWED' });

  try {
    const authStartedAt = Date.now();
    const user = await authenticate(req);
    const authMs = Date.now() - authStartedAt;
    if (!user) return send(res, 401, { code: 'UNAUTHENTICATED' });
    if (user.role !== 'student') return send(res, 403, { code: 'FORBIDDEN' });

    const raw = Array.isArray(req.query?.assignmentId) ? req.query.assignmentId[0] : req.query?.assignmentId;
    const assignmentId = String(raw || '').trim().slice(0, 200);
    if (!assignmentId) return send(res, 400, { code: 'ASSIGNMENT_REQUIRED', message: 'Thiếu mã nhiệm vụ.' });

    const dataStartedAt = Date.now();
    const workspace = await getStudentWorkspace(user, assignmentId);
    const dataMs = Date.now() - dataStartedAt;
    res.setHeader('Server-Timing', `auth;dur=${authMs}, data;dur=${dataMs}, total;dur=${Date.now() - startedAt}`);
    return send(res, 200, { workspace, requestId });
  } catch (error: any) {
    const code = String(error?.message || 'STUDENT_WORKSPACE_ERROR');
    const status = code === 'FORBIDDEN' ? 403 : code.includes('NOT_FOUND') ? 404 : 500;
    const log = status >= 500 ? console.error : console.warn;
    log('[student/workspace]', { requestId, code, status, durationMs: Date.now() - startedAt });
    return send(res, status, {
      code: status === 500 ? 'STUDENT_WORKSPACE_ERROR' : code,
      message: status === 404 ? 'Không tìm thấy nhiệm vụ hoặc bạn chưa được phân công.' : status === 500 ? 'Không thể tải không gian học tập.' : 'Bạn không có quyền truy cập.',
      requestId
    });
  }
}
