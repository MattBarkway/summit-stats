CREATE TABLE tokens
(
    athlete_id    BIGINT PRIMARY KEY,
    access_token  TEXT   NOT NULL,
    refresh_token TEXT   NOT NULL,
    expires_at    BIGINT NOT NULL
);
