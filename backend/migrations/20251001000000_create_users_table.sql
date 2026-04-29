CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users
(
    athlete_id     BIGINT PRIMARY KEY REFERENCES tokens(athlete_id),
    username       TEXT,
    firstname      TEXT,
    lastname       TEXT,
    profile_url    TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
