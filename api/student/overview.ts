/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { authenticate, send } from '../auth/auth.js';
import { getStudentOverview } from '../_lib/student-resources.js';

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

    const dataStartedAt = Date.now();
    const overview = await getStudentOverview(user);
    const dataMs = Date.now() - dataStartedAt;
    res.setHeader('Server-Timing', `auth;dur=${authMs}, data;dur=${dataMs}, total;dur=${Date.now() - startedAt}`);
    return send(res, 200, { overview, requestId });
  } catch (error: any) {
    const code = String(error?.message || 'STUDENT_OVERVIEW_ERROR');
    const status = code === 'FORBIDDEN' ? 403 : 500;
    console.error('[student/overview]', { requestId, code, status, durationMs: Date.now() - startedAt });
    return send(res, status, { code: status === 500 ? 'STUDENT_OVERVIEW_ERROR' : code, message: status === 500 ? 'Không thể tải bàn học.' : 'Bạn không có quyền truy cập.', requestId });
  }
}
