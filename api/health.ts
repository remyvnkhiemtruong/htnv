/// <reference types="node" />
import { academicHealth } from './_lib/academic-core.js';
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
      region: process.env.APP_REGION || process.env.VERCEL_REGION || 'unknown',
      release: {
        commitSha: process.env.APP_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local',
        commitRef: process.env.APP_GIT_COMMIT_REF || process.env.VERCEL_GIT_COMMIT_REF || 'local',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
      },
      security: {
        jwtSecretConfigured: jwtSecretStatus.configured,
        jwtSecretSource: jwtSecretStatus.source,
        dedicatedJwtSecret: jwtSecretStatus.source === 'environment'
      },
      counts: {
        assignments: counts.assignments,
        portfolios: counts.portfolios,
        versions: counts.versions,
        realVersions: counts.real_versions,
        simulationVersions: counts.simulation_versions,
        aiReviews: counts.ai_reviews,
        realAiReviews: counts.real_ai_reviews,
        simulationAiReviews: counts.simulation_ai_reviews,
        activeAiReviews: counts.active_ai_reviews
      },
      textVersioning: Boolean(counts.textVersioning),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[health]', {
      route: '/api/health',
      region: process.env.APP_REGION || process.env.VERCEL_REGION || 'unknown',
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
