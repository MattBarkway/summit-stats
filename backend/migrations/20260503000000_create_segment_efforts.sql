CREATE TABLE segment_efforts (
    id             BIGINT PRIMARY KEY,
    activity_id    BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    athlete_id     BIGINT NOT NULL REFERENCES users(athlete_id),
    segment_id     BIGINT NOT NULL,
    segment_name   TEXT,
    elapsed_time_s INTEGER NOT NULL,
    start_date     TIMESTAMPTZ NOT NULL,
    kom_rank       INTEGER,
    pr_rank        INTEGER
);

CREATE INDEX idx_segment_efforts_segment_athlete
    ON segment_efforts(segment_id, athlete_id, start_date);

CREATE INDEX idx_segment_efforts_athlete ON segment_efforts(athlete_id);
