-- Backfill KOM + top-10 rules for existing groups (newly seeded for new groups
-- via groups::seed_default_rules).
INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
SELECT id, 'kom'::point_trigger, 1, 250, NULL FROM groups
ON CONFLICT (group_id, trigger_type, threshold, sport_type) DO NOTHING;

INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
SELECT id, 'top_ten'::point_trigger, 1, 100, NULL FROM groups
ON CONFLICT (group_id, trigger_type, threshold, sport_type) DO NOTHING;

-- Force re-sync so existing cached activities get scanned for segment efforts
-- (has_kom / has_top_ten were never set under the old code path).
DELETE FROM earned_points;
DELETE FROM activities;
UPDATE users SET last_synced_at = NULL;
