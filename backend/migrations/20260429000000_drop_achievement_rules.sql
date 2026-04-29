-- Achievement rule fired on Strava's achievement_count, which includes any
-- segment achievement (KOMs, top-10s, PRs, etc). Too noisy — pollutes feed
-- for any moderately-active rider. Removing rule + already-awarded points.

DELETE FROM earned_points
WHERE rule_id IN (SELECT id FROM point_rules WHERE trigger_type = 'achievement');

DELETE FROM point_rules WHERE trigger_type = 'achievement';
