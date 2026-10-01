const baseUrl = String(process.env.BASE_URL || 'https://htnv.io.vn').replace(/\/$/, '');
const expectedGitSha = String(process.env.EXPECTED_GIT_SHA || '').trim();
const timeoutMs = Math.max(30_000, Number(process.env.RELEASE_WAIT_TIMEOUT_MS || 12 * 60_000));
const intervalMs = Math.max(5_000, Number(process.env.RELEASE_WAIT_INTERVAL_MS || 15_000));

if (!expectedGitSha) {
  console.error('EXPECTED_GIT_SHA is required.');
  process.exit(2);
}

const matchesSha = (actual, expected) => {
  const a = String(actual || '').trim();
  const e = String(expected || '').trim();
  return Boolean(a && e && (a === e || (a.length >= 7 && e.startsWith(a)) || (e.length >= 7 && a.startsWith(e))));
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function readHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

const startedAt = Date.now();
let attempt = 0;
let lastSeen = '';

while (Date.now() - startedAt < timeoutMs) {
  attempt += 1;
  try {
    const { status, body } = await readHealth();
    const deployedSha = String(body?.release?.commitSha || '');
    lastSeen = deployedSha || lastSeen;
    if (status === 200 && body?.ok === true && matchesSha(deployedSha, expectedGitSha)) {
      console.log(`✓ Production reached expected commit ${expectedGitSha.slice(0, 12)} after ${attempt} check(s).`);
      process.exit(0);
    }
    console.log(
      `… release check ${attempt}: HTTP ${status}, deployed=${deployedSha ? deployedSha.slice(0, 12) : 'unknown'}, expected=${expectedGitSha.slice(0, 12)}`
    );
  } catch (error) {
    console.log(`… release check ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
  }

  await sleep(intervalMs);
}

console.error(
  `Production did not reach expected commit ${expectedGitSha.slice(0, 12)} within ${Math.round(timeoutMs / 1000)}s. Last seen: ${lastSeen ? lastSeen.slice(0, 12) : 'unknown'}.`
);
process.exit(1);
