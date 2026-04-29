-- segment_challenge_progress carries the activity_id of the best effort so
-- that challenge resolution can write a feed-linkable earned_points row even
-- after the raw segment_efforts cache has aged out.
ALTER TABLE segment_challenge_progress
    ADD COLUMN activity_id BIGINT;

-- Backfill from cached segment_efforts where still available.
UPDATE segment_challenge_progress scp
SET activity_id = se.activity_id
FROM segment_efforts se
WHERE se.segment_id = (SELECT segment_id FROM segment_challenges WHERE id = scp.challenge_id)
  AND se.athlete_id = scp.athlete_id
  AND se.elapsed_time_s = scp.best_time_s
  AND se.start_date    = scp.best_at;
