-- Batch 4: make academic provenance constraints explicit.
-- This replaces runtime schema patching from the retired academic-v2 service.
-- Apply through the normal migration workflow after validation on a Neon branch.

DO $$
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
$$;

CREATE INDEX IF NOT EXISTS idx_vfl_feedback
  ON version_feedback_links(feedback_id);
