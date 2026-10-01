-- Batch 5 release-safe migration for Neon migration runner.
-- Validated first on a Neon temporary branch. Apply to production only after explicit approval.

ALTER TABLE version_feedback_links
  ADD CONSTRAINT version_feedback_links_feedback_fk
  FOREIGN KEY (feedback_id)
  REFERENCES feedbacks(id)
  ON DELETE CASCADE
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_vfl_feedback
  ON version_feedback_links(feedback_id);

ALTER TABLE version_feedback_links
  VALIDATE CONSTRAINT version_feedback_links_feedback_fk;
