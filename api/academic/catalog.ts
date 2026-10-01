/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { assertSameOrigin, authenticate, body, send } from '../auth/auth.js';
import { createRubricVersion, saveLiteratureRevision } from '../_lib/academic-core.js';

const AXES = ['plot_situation', 'character_detail', 'narrator_pov', 'space_time', 'language_tone_symbol', 'form_argument'];
const LEVEL_LABELS: Record<number, string> = { 1: 'Chưa đạt', 2: 'Đạt', 3: 'Khá', 4: 'Xuất sắc' };
const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

function normalizeRubricInput(input: any) {
  const criteria = Array.isArray(input?.criteria) ? input.criteria : [];
  if (criteria.length !== AXES.length) throw new Error('INVALID_RUBRIC_CRITERIA');
  const axes = criteria.map((criterion: any) => text(criterion?.axisId, 60));
  if (new Set(axes).size !== AXES.length || AXES.some(axis => !axes.includes(axis))) throw new Error('INVALID_RUBRIC_AXES');

  const normalizedCriteria = criteria.map((criterion: any) => {
    const axisId = text(criterion.axisId, 60);
    const weight = Number(criterion.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error('INVALID_RUBRIC_WEIGHT');
    const levels = Array.isArray(criterion.levels) ? criterion.levels : [];
    const levelNumbers = levels.map((level: any) => Number(level?.level));
    if (levels.length !== 4 || new Set(levelNumbers).size !== 4 || [1, 2, 3, 4].some(level => !levelNumbers.includes(level))) {
      throw new Error('INVALID_RUBRIC_LEVELS');
    }
    const normalizedLevels = levels.map((level: any) => {
      const levelNumber = Number(level.level);
      const score = Number(level.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error('INVALID_RUBRIC_SCORE');
      return {
        level: levelNumber,
        label: LEVEL_LABELS[levelNumber],
        score,
        description: text(level.description, 6000),
        observableIndicators: Array.isArray(level.observableIndicators)
          ? level.observableIndicators.slice(0, 30).map((item: unknown) => text(item, 1000)).filter(Boolean)
          : []
      };
    }).sort((a: any, b: any) => a.level - b.level);
    return {
      id: text(criterion.id || criterion.publicId || `criterion-${axisId}`, 120),
      axisId,
      title: text(criterion.title, 300),
      weight,
      levels: normalizedLevels
    };
  });

  return {
    ...input,
    title: text(input?.title, 240),
    description: text(input?.description, 6000),
    criteria: normalizedCriteria
  };
}

const safeMessage = (code: string) => {
  if (code === 'CSRF_ORIGIN_MISMATCH') return 'Yêu cầu không hợp lệ.';
  if (code === 'SCHEMA_MIGRATION_REQUIRED') return 'Hệ thống đang nâng cấp version ngữ liệu. Vui lòng thử lại sau.';
  if (code === 'LITERATURE_TEXT_NOT_FOUND') return 'Không tìm thấy tác phẩm cần chỉnh sửa.';
  if (code.startsWith('INVALID_') || code === 'VALIDATION_ERROR') return 'Dữ liệu danh mục không hợp lệ.';
  return 'Không thể lưu danh mục.';
};

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  const requestId = String(req.headers?.['x-vercel-id'] || req.headers?.['x-request-id'] || randomUUID());
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Request-Id', requestId);
  if (req.method !== 'POST') return send(res, 405, { code: 'METHOD_NOT_ALLOWED' });

  try {
    assertSameOrigin(req);
    const user = await authenticate(req);
    if (!user) return send(res, 401, { code: 'UNAUTHENTICATED' });
    if (!['teacher', 'admin'].includes(user.role)) return send(res, 403, { code: 'FORBIDDEN' });
    const rawInput = body(req);
    if (Buffer.byteLength(JSON.stringify(rawInput), 'utf8') > 1_500_000) throw new Error('CONTENT_TOO_LARGE');
    const action = String(rawInput.action || '');
    const input = action === 'create_rubric_version' ? normalizeRubricInput(rawInput) : rawInput;
    const result = action === 'save_literature'
      ? await saveLiteratureRevision(user, input, req)
      : action === 'create_rubric_version'
        ? await createRubricVersion(user, input, req)
        : null;
    if (!result) return send(res, 400, { code: 'UNKNOWN_ACTION', message: 'Thao tác không hợp lệ.' });
    res.setHeader('Server-Timing', `total;dur=${Date.now() - startedAt}`);
    return send(res, 200, result);
  } catch (error: any) {
    const code = String(error?.message || 'CATALOG_ERROR');
    const status = code === 'CSRF_ORIGIN_MISMATCH' || code === 'FORBIDDEN' ? 403
      : code.includes('NOT_FOUND') ? 404
      : code.startsWith('INVALID_') || code === 'VALIDATION_ERROR' || code === 'SCHEMA_MIGRATION_REQUIRED' || code === 'CONTENT_TOO_LARGE' ? 400
      : 500;
    console.error('[academic/catalog]', { requestId, code, status, route: '/api/academic/catalog', durationMs: Date.now() - startedAt });
    res.setHeader('Server-Timing', `total;dur=${Date.now() - startedAt}`);
    return send(res, status, { code, message: safeMessage(code), requestId });
  }
}
