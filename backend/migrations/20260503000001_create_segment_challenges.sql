CREATE TABLE segment_challenges (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id      UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    segment_id    BIGINT NOT NULL,
    segment_name  TEXT NOT NULL,
    starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at       TIMESTAMPTZ NOT NULL,
    points_winner INTEGER NOT NULL DEFAULT 500,
    points_top3   INTEGER NOT NULL DEFAULT 200,
    points_finish INTEGER NOT NULL DEFAULT 50,
    resolved_at   TIMESTAMPTZ,
    created_by    BIGINT NOT NULL REFERENCES users(athlete_id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_segment_challenges_group ON segment_challenges(group_id);
CREATE INDEX idx_segment_challenges_unresolved
    ON segment_challenges(group_id, resolved_at, ends_at);

CREATE TABLE segment_challenge_results (
    challenge_id  UUID NOT NULL REFERENCES segment_challenges(id) ON DELETE CASCADE,
    athlete_id    BIGINT NOT NULL REFERENCES users(athlete_id),
    best_time_s   INTEGER NOT NULL,
    rank          INTEGER NOT NULL,
    PRIMARY KEY (challenge_id, athlete_id)
);

ALTER TYPE point_trigger ADD VALUE IF NOT EXISTS 'segment_challenge';
