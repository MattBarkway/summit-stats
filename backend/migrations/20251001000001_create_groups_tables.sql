CREATE TABLE groups
(
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    description TEXT,
    invite_code TEXT        NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    owner_id    BIGINT      NOT NULL REFERENCES users(athlete_id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members
(
    group_id   UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    athlete_id BIGINT      NOT NULL REFERENCES users(athlete_id),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, athlete_id)
);

CREATE INDEX idx_group_members_athlete ON group_members(athlete_id);
