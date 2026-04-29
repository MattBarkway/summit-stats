CREATE TABLE activities
(
    id                BIGINT PRIMARY KEY,
    athlete_id        BIGINT      NOT NULL REFERENCES users(athlete_id),
    name              TEXT,
    sport_type        TEXT        NOT NULL,
    distance_m        DOUBLE PRECISION NOT NULL,
    moving_time_s     INTEGER     NOT NULL,
    elevation_m       DOUBLE PRECISION NOT NULL DEFAULT 0,
    start_date        TIMESTAMPTZ NOT NULL,
    has_kom           BOOLEAN     NOT NULL DEFAULT FALSE,
    achievement_count INTEGER     NOT NULL DEFAULT 0,
    synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_athlete_date ON activities(athlete_id, start_date DESC);
