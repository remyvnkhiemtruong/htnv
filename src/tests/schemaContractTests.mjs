import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, error: message });
    console.error(`✗ ${name} — ${message}`);
  }
};
const assert = (condition, message = 'Assertion failed') => {
  if (!condition) throw new Error(message);
};

const academic = read('api/_lib/academic-core.js');
const workflow = read('api/_lib/academic-service.js');
const migration = read('scripts/migrate-audit-hardening-20260911.sql');

await test('SC01: production rubric conflict target has a matching unique index migration', () => {
  assert(
    academic.includes('ON CONFLICT(portfolio_id,version_id,evaluator_id,evaluator_role)'),
    'Production submitRubric conflict target changed; update schema contract test.'
  );
  assert(
    migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_rubric_submissions_evaluator_unique'),
    'Missing unique index migration for rubric_submissions conflict target.'
  );
  assert(
    migration.includes('rubric_submissions(portfolio_id, version_id, evaluator_id, evaluator_role)'),
    'Rubric unique index columns do not match production ON CONFLICT target.'
  );
});

await test('SC02: production AI feedback idempotency has a matching partial unique index migration', () => {
  assert(
    workflow.includes('ON CONFLICT(source_ai_review_id) WHERE source_ai_review_id IS NOT NULL DO NOTHING'),
    'Production AI feedback conflict target changed; update schema contract test.'
  );
  assert(
    migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_ai_review_unique'),
    'Missing unique index migration for source_ai_review_id.'
  );
  assert(
    migration.includes('ON feedbacks(source_ai_review_id)') && migration.includes('WHERE source_ai_review_id IS NOT NULL'),
    'AI feedback unique index must be partial on non-null source_ai_review_id.'
  );
});

await test('SC03: immutable version sequence is protected at database level', () => {
  assert(academic.includes('nextSeq = prev ? Number(prev.sequence_no || 0) + 1 : 1'));
  assert(migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS idx_versions_portfolio_sequence'));
  assert(migration.includes('portfolio_versions(portfolio_id, sequence_no)'));
});

await test('SC04: rubric review read path has a supporting time index migration', () => {
  assert(migration.includes('CREATE INDEX IF NOT EXISTS idx_rubric_submissions_portfolio_time'));
  assert(migration.includes('rubric_submissions(portfolio_id, submitted_at DESC)'));
});

await test('SC05: version-to-feedback provenance FK is an explicit migration', () => {
  const provenance = read('scripts/migrations/20261002_academic_core_contracts.sql');
  assert(provenance.includes('version_feedback_links_feedback_fk'));
  assert(provenance.includes('FOREIGN KEY (feedback_id)'));
  assert(provenance.includes('REFERENCES feedbacks(id)'));
});

await test('SC06: immutable portfolio versions are established by explicit migration', () => {
  const contracts = read('scripts/migrations/20261002_academic_core_contracts.sql');
  assert(contracts.includes('CREATE OR REPLACE FUNCTION prevent_portfolio_version_mutation'));
  assert(contracts.includes('BEFORE UPDATE OR DELETE ON portfolio_versions'));
  assert(contracts.includes('CREATE TRIGGER portfolio_versions_immutable_update'));
});

const failed = results.filter(result => !result.ok);
console.log(`${results.length - failed.length}/${results.length} schema contract tests passed.`);
if (failed.length) process.exit(1);
