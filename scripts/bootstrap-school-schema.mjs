// Initialize a fresh PostgreSQL database for the current HTNV application.
// Run explicitly once with DATABASE_URL set; safe to re-run without resetting accounts.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { Pool } from 'pg';
import { ensureAcademicSchema } from '../api/_lib/academic.js';

if (process.argv[2] !== '--apply' || !process.env.DATABASE_URL) {
  console.error('Usage: DATABASE_URL=... node scripts/bootstrap-school-schema.mjs --apply');
  process.exit(2);
}
const pool = new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:15000});
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    role text NOT NULL CHECK (role IN ('student','teacher','peer','researcher','admin','ai')),
    password_hash text NOT NULL,
    must_change_password boolean NOT NULL DEFAULT true,
    account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','locked')),
    profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_login timestamptz
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS auth_rate_events (
    id bigserial PRIMARY KEY, event_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS app_runtime_config (
    config_key text PRIMARY KEY, config_value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`INSERT INTO app_runtime_config(config_key,config_value)
    VALUES('student_roster_seed_v1',$1) ON CONFLICT(config_key) DO NOTHING`,
    [randomBytes(48).toString('hex')]);
  await client.query('COMMIT');
  // The project's existing academic schema routine creates the baseline tables and indexes.
  await ensureAcademicSchema();
  await client.query('BEGIN');
  await client.query(`CREATE TABLE IF NOT EXISTS literature_text_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    literature_text_id uuid NOT NULL REFERENCES literature_texts(id) ON DELETE CASCADE,
    version_no integer NOT NULL,
    title text NOT NULL, author text NOT NULL, year_text text NOT NULL DEFAULT '',
    genre text NOT NULL DEFAULT '', synopsis text NOT NULL DEFAULT '',
    excerpt text NOT NULL DEFAULT '', full_content text NOT NULL DEFAULT '',
    historical_context text NOT NULL DEFAULT '', tags text[] NOT NULL DEFAULT '{}',
    content_checksum text NOT NULL, created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(literature_text_id,version_no)
  )`);
  await client.query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS literature_text_version_id uuid
    REFERENCES literature_text_versions(id) ON DELETE SET NULL`);
  const v4 = await fs.readFile(new URL('./migrate-workflow-v4.sql', import.meta.url), 'utf8');
  // The migration file has its own transaction. Finish this one first.
  await client.query('COMMIT');
  await client.query(v4);
  const hardening = await fs.readFile(new URL('./migrate-audit-hardening-20260911.sql', import.meta.url), 'utf8');
  await client.query(hardening);
  const counts = await client.query(`SELECT
    (SELECT count(*)::int FROM app_users) users,
    (SELECT count(*)::int FROM classes) classes,
    (SELECT count(*)::int FROM assignments) assignments`);
  console.log(JSON.stringify({status:'schema_ready',...counts.rows[0]}));
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
