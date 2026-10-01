const baseUrl = String(process.env.BASE_URL || 'https://htnv.io.vn').replace(/\/$/, '');
const requireDedicatedSecret = String(process.env.REQUIRE_DEDICATED_JWT_SECRET || '').toLowerCase() === 'true';
const expectedGitSha = String(process.env.EXPECTED_GIT_SHA || '').trim();
const email = String(process.env.SMOKE_TEST_EMAIL || '').trim();
const password = String(process.env.SMOKE_TEST_PASSWORD || '');

const checks = [];
const record = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: 'follow',
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/html;q=0.9',
        ...(init.headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function json(response) {
  return response.json().catch(() => ({}));
}

try {
  const home = await request('/');
  record('homepage responds', home.status === 200, `HTTP ${home.status}`);

  const health = await request('/api/health');
  const healthBody = await json(health);
  record('health endpoint responds', health.status === 200 && healthBody?.ok === true, `HTTP ${health.status}`);
  record(
    'health endpoint is private no-store',
    String(health.headers.get('cache-control') || '').toLowerCase().includes('no-store'),
    String(health.headers.get('cache-control') || 'missing')
  );

  const releaseSha = String(healthBody?.release?.commitSha || '');
  if (expectedGitSha) {
    const matchesExpectedCommit =
      releaseSha === expectedGitSha ||
      (releaseSha.length >= 7 && expectedGitSha.startsWith(releaseSha)) ||
      (expectedGitSha.length >= 7 && releaseSha.startsWith(expectedGitSha));
    record(
      'production release commit matches expected SHA',
      matchesExpectedCommit,
      `expected ${expectedGitSha.slice(0, 12)}, got ${releaseSha ? releaseSha.slice(0, 12) : 'missing'}`
    );
  } else {
    console.log(`ℹ release SHA check skipped; deployed commit is ${releaseSha || 'not exposed'}`);
  }

  const csp = String(health.headers.get('content-security-policy') || '');
  record('CSP blocks framing', csp.includes("frame-ancestors 'none'"), csp ? 'configured' : 'missing');
  record(
    'content type sniffing is disabled',
    String(health.headers.get('x-content-type-options') || '').toLowerCase() === 'nosniff',
    String(health.headers.get('x-content-type-options') || 'missing')
  );
  record(
    'JWT signing source is available',
    healthBody?.security?.jwtSecretConfigured === true,
    String(healthBody?.security?.jwtSecretSource || 'unknown')
  );

  const dedicated = healthBody?.security?.dedicatedJwtSecret === true;
  record(
    'dedicated JWT_SECRET deployment policy',
    dedicated || !requireDedicatedSecret,
    dedicated ? 'environment' : 'compatibility fallback still active'
  );

  const me = await request('/api/auth/me');
  record('unauthenticated /api/auth/me is protected', me.status === 401, `HTTP ${me.status}`);

  const overview = await request('/api/student/overview');
  record('student overview requires authentication', overview.status === 401, `HTTP ${overview.status}`);

  const workspace = await request('/api/student/workspace?assignmentId=smoke-invalid');
  record('student workspace requires authentication', workspace.status === 401, `HTTP ${workspace.status}`);

  const teacherOverview = await request('/api/teacher/overview');
  record('teacher overview requires authentication', teacherOverview.status === 401, `HTTP ${teacherOverview.status}`);

  const teacherWorkspace = await request('/api/teacher/workspace?assignmentId=smoke-invalid&studentId=00000000-0000-4000-8000-000000000000');
  record('teacher workspace requires authentication', teacherWorkspace.status === 401, `HTTP ${teacherWorkspace.status}`);

  const teacherLiterature = await request('/api/teacher/literature');
  record('teacher literature requires authentication', teacherLiterature.status === 401, `HTTP ${teacherLiterature.status}`);

  if (email && password) {
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: baseUrl
      },
      body: JSON.stringify({ email, password })
    });
    const loginBody = await json(login);
    record('credentialed login succeeds', login.status === 200 && Boolean(loginBody?.user?.id), `HTTP ${login.status}`);

    const cookie = login.headers.get('set-cookie')?.split(';')[0] || '';
    if (login.status === 200 && cookie) {
      const session = await request('/api/auth/me', { headers: { Cookie: cookie } });
      const sessionBody = await json(session);
      record('authenticated session round-trip succeeds', session.status === 200 && Boolean(sessionBody?.user?.id), `HTTP ${session.status}`);

      if (sessionBody?.user?.role === 'student') {
        const studentOverview = await request('/api/student/overview', { headers: { Cookie: cookie } });
        const body = await json(studentOverview);
        record(
          'authenticated student overview succeeds',
          studentOverview.status === 200 && Array.isArray(body?.overview?.assignments),
          `HTTP ${studentOverview.status}`
        );
      }

      if (sessionBody?.user?.role === 'teacher') {
        const scopedOverview = await request('/api/teacher/overview', { headers: { Cookie: cookie } });
        const body = await json(scopedOverview);
        record(
          'authenticated teacher overview succeeds',
          scopedOverview.status === 200 && Array.isArray(body?.overview?.assignments),
          `HTTP ${scopedOverview.status}`
        );

        const firstPortfolio = body?.overview?.portfolios
          ? Object.values(body.overview.portfolios)[0]
          : null;
        if (firstPortfolio?.assignmentId && firstPortfolio?.studentId) {
          const params = new URLSearchParams({
            assignmentId: firstPortfolio.assignmentId,
            studentId: firstPortfolio.studentId
          });
          const scopedWorkspace = await request(`/api/teacher/workspace?${params.toString()}`, { headers: { Cookie: cookie } });
          const workspaceBody = await json(scopedWorkspace);
          record(
            'authenticated teacher workspace succeeds',
            scopedWorkspace.status === 200 && workspaceBody?.workspace?.portfolio?.studentId === firstPortfolio.studentId,
            `HTTP ${scopedWorkspace.status}`
          );
        }
      }
    } else if (login.status === 200) {
      record('login returns session cookie', false, 'missing Set-Cookie');
    }
  } else {
    console.log('ℹ credentialed smoke checks skipped (SMOKE_TEST_EMAIL/SMOKE_TEST_PASSWORD not set)');
  }
} catch (error) {
  record('smoke runner completed', false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter(check => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} smoke checks passed against ${baseUrl}`);
if (failed.length) process.exit(1);
