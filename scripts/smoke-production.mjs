const baseUrl = String(process.env.BASE_URL || 'https://htnv.io.vn').replace(/\/$/, '');
const requireDedicatedSecret = String(process.env.REQUIRE_DEDICATED_JWT_SECRET || '').toLowerCase() === 'true';
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
      redirect: 'manual',
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
