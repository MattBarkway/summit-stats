CREATE TYPE point_trigger AS ENUM ('distance_km', 'elevation_m', 'kom', 'achievement');

CREATE TABLE point_rules
(
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id     UUID          NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    trigger_type point_trigger NOT NULL,
    threshold    DOUBLE PRECISION NOT NULL,
    points       INTEGER       NOT NULL,
    sport_type   TEXT,
    UNIQUE (group_id, trigger_type, threshold, sport_type)
);

CREATE TABLE earned_points
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    athlete_id  BIGINT      NOT NULL REFERENCES users(athlete_id),
    activity_id BIGINT      REFERENCES activities(id),
    rule_id     UUID        NOT NULL REFERENCES point_rules(id),
    points      INTEGER     NOT NULL,
    earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, athlete_id, activity_id, rule_id)
);

CREATE INDEX idx_earned_points_group_athlete ON earned_points(group_id, athlete_id);
