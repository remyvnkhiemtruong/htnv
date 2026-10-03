-- Batch 2: normalize legacy simulated AI review state without deleting history.
-- Safe to rerun: only touches rows still in the legacy rejected+pending combination.

WITH candidates AS (
  SELECT ar.id
  FROM ai_review_requests ar
  JOIN portfolio_versions v ON v.id=ar.version_id
  WHERE v.change_source='simulation'
    AND ar.status='rejected'
    AND ar.teacher_review_status='pending'
),
updated AS (
  UPDATE ai_review_requests ar
  SET teacher_review_status='rejected',
      teacher_note=CASE
        WHEN coalesce(ar.teacher_note,'')='' THEN '[system] Legacy simulation review closed in Batch 2; this is not a teacher decision.'
        ELSE ar.teacher_note
      END
  FROM candidates c
  WHERE ar.id=c.id
  RETURNING ar.id
)
INSERT INTO audit_logs(actor_id,actor_role,action,target_type,target_id,after_json,ip_address)
SELECT NULL,'system','BATCH2_CLOSE_LEGACY_SIMULATION_AI','ai_review_batch','simulation',
       jsonb_build_object('closedReviews',count(*),'policy','simulation reviews are retained for provenance but excluded from operational queues'),
       ''
FROM updated;

UPDATE assignments
SET workflow_config=coalesce(workflow_config,'{}'::jsonb) || '{"aiReviewStages":["initial"]}'::jsonb
WHERE NOT coalesce(workflow_config,'{}'::jsonb) ? 'aiReviewStages';

INSERT INTO audit_logs(actor_id,actor_role,action,target_type,target_id,after_json,ip_address)
VALUES(NULL,'system','BATCH2_SET_AI_REVIEW_STAGES','assignment_batch','all',
       '{"aiReviewStages":["initial"],"reason":"V0 and V2 no longer wait for AI by default"}'::jsonb,'');
