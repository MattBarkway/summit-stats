CREATE TABLE badges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    icon        TEXT NOT NULL
);

CREATE TABLE user_badges (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id BIGINT NOT NULL REFERENCES users(athlete_id),
    badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    group_id   UUID REFERENCES groups(id) ON DELETE SET NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context    JSONB
);

-- Same badge can be awarded again across different cycles. The cycle context
-- key uniquely identifies the awarding window. NULL group_id = global badge
-- (e.g. first KOM); paired with NULL cycle context to dedupe.
CREATE UNIQUE INDEX user_badges_unique
    ON user_badges (
        athlete_id,
        badge_id,
        COALESCE(group_id::text, ''),
        COALESCE(context->>'cycle_start', '')
    );

CREATE INDEX idx_user_badges_athlete       ON user_badges(athlete_id);
CREATE INDEX idx_user_badges_athlete_group ON user_badges(athlete_id, group_id);

INSERT INTO badges (slug, name, description, icon) VALUES
  ('cycle_winner',  'Cycle Champion',  'Finished 1st in a closed cycle.',          'Crown'),
  ('podium',        'Podium Finish',   'Finished top 3 in a closed cycle.',        'Trophy'),
  ('first_kom',     'KOM Hunter',      'First-ever KOM recorded.',                 'Trophy'),
  ('first_top_ten', 'Top 10 Club',     'First-ever top-10 segment effort.',        'Medal'),
  ('century_ride',  'Century',         'Single ride at least 100 km.',             'Bike'),
  ('everester',     'Everester',       'Single ride at least 8848 m elevation.',   'Mountain'),
  ('group_founder', 'Group Founder',   'Created a SummitStats group.',             'Sprout');
