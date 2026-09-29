BEGIN;

ALTER TABLE portfolio_drafts
  ADD COLUMN IF NOT EXISTS draft_revision bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN portfolio_drafts.draft_revision IS
  'Optimistic concurrency revision incremented after each successful draft save.';

COMMIT;
