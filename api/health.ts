/// <reference types="node" />
import { academicHealth } from './_lib/academic-v3.js';
import { authSecretStatus } from './auth/auth.js';

const HEALTH_CACHE_MS = 30_000;
let healthCache: { at: number; value: Awaited<ReturnType<typeof academicHealth>> } | null = null;

async function cachedAcademicHealth() {
  const now = Date.now();
  if (healthCache && now - healthCache.at < HEALTH_CACHE_MS) return healthCache.value;
  const value = await academicHealth();
  healthCache = { at: Date.now(), value };
  return value;
}

export default async function handler(req: any, res: any) {
  const startedAt = Date.now();
  res.setHeader('Cache-Control', 'no-store');
  try {
    const [counts, jwtSecretStatus] = await Promise.all([
      cachedAcademicHealth(),
      authSecretStatus()
    ]);
    res.setHeader('Server-Timing', `db;dur=${counts.dbRoundTripMs || 0}, total;dur=${Date.now() - startedAt}`);
    return res.status(200).json({
      ok: true,
      service: 'hoc-tot-ngu-van-api',
      product: 'Học tốt Ngữ Văn',
      version: 'backend-v4-workflow',
      academicData: 'postgresql',
      aiFeedbackMode: 'manual-chatgpt-response-visible-to-student',
      region: process.env.VERCEL_REGION || 'unknown',
      security: {
        jwtSecretConfigured: jwtSecretStatus.configured,
        jwtSecretSource: jwtSecretStatus.source,
        dedicatedJwtSecret: jwtSecretStatus.source === 'environment'
      },
      counts: {
        assignments: counts.assignments,
        portfolios: counts.portfolios,
        versions: counts.versions,
        aiReviews: counts.ai_reviews
      },
      textVersioning: Boolean(counts.textVersioning),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[health]', {
      route: '/api/health',
      region: process.env.VERCEL_REGION || 'unknown',
      durationMs: Date.now() - startedAt,
      code: String(error?.message || 'BACKEND_UNAVAILABLE')
    });
    res.setHeader('Server-Timing', `total;dur=${Date.now() - startedAt}`);
    return res.status(500).json({
      ok: false,
      service: 'hoc-tot-ngu-van-api',
      product: 'Học tốt Ngữ Văn',
      version: 'backend-v4-workflow',
      message: 'Backend unavailable',
      timestamp: new Date().toISOString()
    });
  }
}
