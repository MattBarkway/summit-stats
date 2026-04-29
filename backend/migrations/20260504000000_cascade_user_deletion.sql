-- Compliance: deauthorisation must cascade-delete all user data within 24h
-- (Strava API Agreement). Re-add FKs from athlete_id-bearing tables to
-- users(athlete_id) with ON DELETE CASCADE, plus tokens at the root.

ALTER TABLE activities
    DROP CONSTRAINT activities_athlete_id_fkey,
    ADD CONSTRAINT activities_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE segment_efforts
    DROP CONSTRAINT segment_efforts_athlete_id_fkey,
    ADD CONSTRAINT segment_efforts_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE earned_points
    DROP CONSTRAINT earned_points_athlete_id_fkey,
    ADD CONSTRAINT earned_points_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE user_badges
    DROP CONSTRAINT user_badges_athlete_id_fkey,
    ADD CONSTRAINT user_badges_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE group_members
    DROP CONSTRAINT group_members_athlete_id_fkey,
    ADD CONSTRAINT group_members_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE segment_challenge_results
    DROP CONSTRAINT segment_challenge_results_athlete_id_fkey,
    ADD CONSTRAINT segment_challenge_results_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE groups
    DROP CONSTRAINT groups_owner_id_fkey,
    ADD CONSTRAINT groups_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE segment_challenges
    DROP CONSTRAINT segment_challenges_created_by_fkey,
    ADD CONSTRAINT segment_challenges_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(athlete_id) ON DELETE CASCADE;

ALTER TABLE users
    DROP CONSTRAINT users_athlete_id_fkey,
    ADD CONSTRAINT users_athlete_id_fkey
        FOREIGN KEY (athlete_id) REFERENCES tokens(athlete_id) ON DELETE CASCADE;
