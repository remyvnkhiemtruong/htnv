-- Batch 4: make academic schema contracts explicit.
-- This replaces runtime schema patching from the retired academic-v2 service.
-- Apply through the normal migration workflow after validation on a Neon branch.

-- Immutable submitted versions must be protected by schema, not application convention.
CREATE OR REPLACE FUNCTION prevent_portfolio_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $migration$
BEGIN
  RAISE EXCEPTION 'portfolio_versions are immutable';
END
$migration$;

DROP TRIGGER IF EXISTS portfolio_versions_immutable_update ON portfolio_versions;
CREATE TRIGGER portfolio_versions_immutable_update
BEFORE UPDATE OR DELETE ON portfolio_versions
FOR EACH ROW
EXECUTE FUNCTION prevent_portfolio_version_mutation();

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'version_feedback_links_feedback_fk'
  ) THEN
    ALTER TABLE version_feedback_links
      ADD CONSTRAINT version_feedback_links_feedback_fk
      FOREIGN KEY (feedback_id)
      REFERENCES feedbacks(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_vfl_feedback
  ON version_feedback_links(feedback_id);

ALTER TABLE version_feedback_links
  VALIDATE CONSTRAINT version_feedback_links_feedback_fk;
