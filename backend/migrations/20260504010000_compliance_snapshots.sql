-- Strava-API compliance: split storage into raw cache (≤7d) and derived
-- ledger (kept). earned_points stops referencing activities and grows
-- snapshot columns; new segment_challenge_progress table holds aggregate
-- challenge state independent of the segment_efforts cache.

-- earned_points.activity_id becomes a free reference (used to build the
-- "View on Strava" link). Drop the FK so cache purges don't cascade-delete
-- the points ledger.
ALTER TABLE earned_points
    DROP CONSTRAINT earned_points_activity_id_fkey;

-- Snapshot of the source activity, captured at evaluation time. Kept
-- forever as derived data.
ALTER TABLE earned_points
    ADD COLUMN activity_name          TEXT,
    ADD COLUMN activity_sport_type    TEXT,
    ADD COLUMN activity_distance_m    DOUBLE PRECISION,
    ADD COLUMN activity_moving_time_s INT,
    ADD COLUMN activity_elevation_m   DOUBLE PRECISION,
    ADD COLUMN activity_start_date    TIMESTAMPTZ;

-- Backfill from existing cached activities.
UPDATE earned_points ep
SET activity_name          = a.name,
    activity_sport_type    = a.sport_type,
    activity_distance_m    = a.distance_m,
    activity_moving_time_s = a.moving_time_s,
    activity_elevation_m   = a.elevation_m,
    activity_start_date    = a.start_date
FROM activities a
WHERE a.id = ep.activity_id;

-- Per-athlete best time on each active challenge. Updated incrementally
-- during sync; readable indefinitely (independent of segment_efforts TTL).
CREATE TABLE segment_challenge_progress (
    challenge_id UUID   NOT NULL REFERENCES segment_challenges(id) ON DELETE CASCADE,
    athlete_id   BIGINT NOT NULL REFERENCES users(athlete_id) ON DELETE CASCADE,
    best_time_s  INT    NOT NULL,
    best_at      TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (challenge_id, athlete_id)
);

CREATE INDEX idx_scp_challenge ON segment_challenge_progress(challenge_id);

-- Seed progress from currently-cached segment_efforts so active challenges
-- have data immediately after deploy (before raw efforts age out).
INSERT INTO segment_challenge_progress (challenge_id, athlete_id, best_time_s, best_at)
SELECT c.id, se.athlete_id, MIN(se.elapsed_time_s)::int4 AS best_time_s,
       (ARRAY_AGG(se.start_date ORDER BY se.elapsed_time_s ASC))[1] AS best_at
FROM segment_challenges c
JOIN segment_efforts se ON se.segment_id = c.segment_id
                       AND se.start_date >= c.starts_at
                       AND se.start_date <  c.ends_at
WHERE c.resolved_at IS NULL
GROUP BY c.id, se.athlete_id
ON CONFLICT DO NOTHING;
