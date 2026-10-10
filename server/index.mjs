import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { getPool } from '../server-dist/api/_lib/db.js';
import health from '../server-dist/api/health.js';
import login from '../server-dist/api/auth/login.js';
import me from '../server-dist/api/auth/me.js';
import logout from '../server-dist/api/auth/logout.js';
import changePassword from '../server-dist/api/auth/change-password.js';
import snapshot from '../server-dist/api/academic/snapshot.js';
import action from '../server-dist/api/academic/action.js';
import catalog from '../server-dist/api/academic/catalog.js';
import users from '../server-dist/api/admin/users.js';
import manage from '../server-dist/api/admin/manage.js';

if (!process.env.DATABASE_URL || String(process.env.JWT_SECRET || '').length < 32) {
  throw new Error('DATABASE_URL and a JWT_SECRET of at least 32 characters are required');
}
const routes = new Map([
  ['/api/health', health], ['/api/auth/login', login], ['/api/auth/me', me],
  ['/api/auth/logout', logout], ['/api/auth/change-password', changePassword],
  ['/api/academic/snapshot', snapshot], ['/api/academic/action', action],
  ['/api/academic/catalog', catalog], ['/api/admin/users', users], ['/api/admin/manage', manage]
]);
const aliases = new Map([
  ['/api/student/overview', 'student-overview'], ['/api/student/workspace', 'student-workspace'],
  ['/api/teacher/overview', 'teacher-overview'], ['/api/teacher/workspace', 'teacher-workspace'],
  ['/api/teacher/literature', 'teacher-literature']
]);
const MAX_BODY = 2 * 1024 * 1024;
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('INVALID_JSON'), { status: 400 }); }
}
const server = createServer(async (req, res) => {
  const started = Date.now();
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(value));
    return res;
  };
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Request-Id', randomUUID());
  let pathname = '/';
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    pathname = url.pathname.replace(/\/$/, '') || '/';
    req.query = Object.create(null);
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key);
      req.query[key] = values.length === 1 ? values[0] : values;
    }
    if (aliases.has(pathname)) req.query.scope = aliases.get(pathname);
    const handler = aliases.has(pathname) ? snapshot : routes.get(pathname);
    if (!handler) return res.status(404).json({ code: 'NOT_FOUND' });
    if (pathname === '/api/health' && !['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ code: 'METHOD_NOT_ALLOWED' });
    }
    req.body = await readBody(req);
    await handler(req, res);
    if (!res.writableEnded) res.status(500).json({ code: 'EMPTY_RESPONSE' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'request_error', path: pathname, code: error.status ? error.message : 'INTERNAL_ERROR' }));
    if (!res.headersSent) res.status(error.status || 500).json({ code: error.status ? error.message : 'INTERNAL_ERROR' });
    else if (!res.writableEnded) res.end();
  } finally {
    console.log(JSON.stringify({ path: pathname, method: req.method, status: res.statusCode, durationMs: Date.now() - started }));
  }
});
server.requestTimeout = 60_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => {
  console.log('HTNV API listening on loopback');
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => process.exit(1), 15_000).unref();
  server.close(async () => {
    await (await getPool()).end();
    clearTimeout(timer);
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
