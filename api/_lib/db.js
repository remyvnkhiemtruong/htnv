function normalizeDatabaseUrl(raw) {
  const value = String(raw || '');
  if (!value) return '';
  if (/[?&]sslmode=/i.test(value)) {
    return value.replace(/([?&])sslmode=[^&]*/i, '$1sslmode=verify-full');
  }
  return `${value}${value.includes('?') ? '&' : '?'}sslmode=verify-full`;
}

const normalized = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (normalized) process.env.DATABASE_URL = normalized;

export function databaseUrl() {
  const value = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (!value) throw new Error('DATABASE_URL is not configured');
  return value;
}

let poolPromise = null;

export async function getPool() {
  if (!poolPromise) {
    poolPromise = import('pg').then(({ Pool }) => new Pool({
      connectionString: databaseUrl(),
      max: 4,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000
    })).catch(err => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}
