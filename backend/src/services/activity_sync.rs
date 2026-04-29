use sqlx::PgPool;
use strava_wrapper::api::StravaAPI;
use strava_wrapper::prelude::*;
use time::format_description::well_known::Rfc3339;
use time::{Duration, OffsetDateTime};

const DEBOUNCE_SECS: i64 = 300;
const FIRST_SYNC_LOOKBACK_DAYS: i64 = 90;
const SHORT_RATE_LIMIT_BUDGET: u32 = 180;
const MAX_PAGES: u32 = 100;

pub async fn sync_activities(
    db: &PgPool,
    athlete_id: i64,
    api: &StravaAPI,
) -> Result<usize, String> {
    let last = sqlx::query!(
        "SELECT last_synced_at FROM users WHERE athlete_id = $1",
        athlete_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?
    .and_then(|r| r.last_synced_at);

    let now = OffsetDateTime::now_utc();
    if let Some(last_at) = last {
        if (now - last_at).whole_seconds() < DEBOUNCE_SECS {
            return Ok(0);
        }
    }

    let after_ts: u64 = match last {
        Some(t) => t.unix_timestamp() as u64,
        None => (now - Duration::days(FIRST_SYNC_LOOKBACK_DAYS)).unix_timestamp() as u64,
    };

    let mut new_count: usize = 0;
    let mut page: u32 = 1;

    loop {
        let activities = api
            .athlete()
            .activities()
            .after(after_ts)
            .page(page)
            .per_page(200)
            .send()
            .await
            .map_err(|e| format!("activities list: {:?}", e))?;

        if activities.is_empty() {
            break;
        }

        if let Some(rl) = api.rate_limit() {
            if rl.short_term_usage > SHORT_RATE_LIMIT_BUDGET {
                tracing::warn!(
                    "Approaching Strava rate limit ({} / {}). Stopping sync early.",
                    rl.short_term_usage,
                    rl.short_term_limit
                );
                return Ok(new_count);
            }
        }

        for act in activities {
            let start_date = OffsetDateTime::parse(&act.start_date, &Rfc3339)
                .map_err(|e| format!("parse start_date {}: {:?}", act.start_date, e))?;

            // Detailed fetch only when activity has segment achievements worth checking.
            // Strava's `achievement_count` covers all segment achievements (KOMs, top-10s,
            // PRs). Zero ⇒ guaranteed no KOMs/top-10s ⇒ skip the extra API call.
            let (has_kom, has_top_ten) = if act.achievement_count > 0 {
                if let Some(rl) = api.rate_limit() {
                    if rl.short_term_usage > SHORT_RATE_LIMIT_BUDGET {
                        tracing::warn!(
                            "Approaching Strava rate limit ({} / {}). Skipping detailed fetch.",
                            rl.short_term_usage,
                            rl.short_term_limit
                        );
                        (false, false)
                    } else {
                        scan_segment_efforts(db, api, act.id, athlete_id).await?
                    }
                } else {
                    scan_segment_efforts(db, api, act.id, athlete_id).await?
                }
            } else {
                (false, false)
            };

            let inserted = sqlx::query!(
                r#"
                INSERT INTO activities
                  (id, athlete_id, name, sport_type, distance_m, moving_time_s,
                   elevation_m, start_date, has_kom, has_top_ten, achievement_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO NOTHING
                "#,
                act.id,
                athlete_id,
                act.name,
                act.sport_type,
                act.distance,
                act.moving_time,
                act.total_elevation_gain,
                start_date,
                has_kom,
                has_top_ten,
                act.achievement_count,
            )
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;

            if inserted.rows_affected() > 0 {
                new_count += 1;
            }
        }

        if page >= MAX_PAGES {
            break;
        }
        page += 1;
    }

    evaluate_points(db, athlete_id).await?;
    crate::services::badges::check_and_award_activity_badges(db, athlete_id).await?;

    sqlx::query!(
        "UPDATE users SET last_synced_at = NOW() WHERE athlete_id = $1",
        athlete_id
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(new_count)
}

/// Fetch detailed activity, scan its segment efforts for KOM (rank 1) and
/// top-10 (rank 2..=10) results, AND persist each effort to the
/// `segment_efforts` cache for use by segment challenges.
async fn scan_segment_efforts(
    db: &PgPool,
    api: &StravaAPI,
    activity_id: i64,
    athlete_id: i64,
) -> Result<(bool, bool), String> {
    let detailed = api
        .activities()
        .get_detailed()
        .id(activity_id as u64)
        .include_all_efforts(true)
        .send()
        .await
        .map_err(|e| format!("detailed activity {}: {:?}", activity_id, e))?;

    let mut has_kom = false;
    let mut has_top_ten = false;

    if let Some(efforts) = detailed.segment_efforts.as_deref() {
        for effort in efforts {
            match effort.kom_rank {
                Some(1) => has_kom = true,
                Some(r) if (2..=10).contains(&r) => has_top_ten = true,
                _ => {}
            }

            let (Some(eid), Some(elapsed), Some(start_chrono)) = (
                effort.id,
                effort.elapsed_time,
                effort.start_date,
            ) else {
                continue;
            };
            // chrono::DateTime<Utc> → time::OffsetDateTime via timestamp.
            let Ok(start) = OffsetDateTime::from_unix_timestamp(start_chrono.timestamp()) else {
                continue;
            };
            let segment = effort.segment.as_ref();
            let Some(seg_id) = segment.and_then(|s| s.id) else {
                continue;
            };
            let seg_name = segment.and_then(|s| s.name.clone());

            sqlx::query!(
                r#"
                INSERT INTO segment_efforts
                  (id, activity_id, athlete_id, segment_id, segment_name,
                   elapsed_time_s, start_date, kom_rank, pr_rank)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
                "#,
                eid,
                activity_id,
                athlete_id,
                seg_id,
                seg_name,
                elapsed,
                start,
                effort.kom_rank,
                effort.pr_rank,
            )
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok((has_kom, has_top_ten))
}

/// Re-evaluate point rules for every member of a group. Idempotent via the
/// UNIQUE constraint on `earned_points`. Use after adding a rule or after
/// clearing earned_points for a rule whose threshold changed.
pub async fn evaluate_for_group(db: &PgPool, group_id: uuid::Uuid) -> Result<(), String> {
    sqlx::query!(
        r#"
        INSERT INTO earned_points (group_id, athlete_id, activity_id, rule_id, points)
        SELECT
            gm.group_id,
            gm.athlete_id,
            a.id,
            pr.id,
            pr.points
        FROM group_members gm
        JOIN point_rules pr ON pr.group_id = gm.group_id
        JOIN activities    a ON a.athlete_id = gm.athlete_id
        WHERE gm.group_id = $1
          AND (pr.sport_type IS NULL OR pr.sport_type = a.sport_type)
          AND (
            (pr.trigger_type = 'distance_km' AND a.distance_m / 1000.0 >= pr.threshold) OR
            (pr.trigger_type = 'elevation_m' AND a.elevation_m         >= pr.threshold) OR
            (pr.trigger_type = 'kom'         AND a.has_kom = TRUE) OR
            (pr.trigger_type = 'top_ten'     AND a.has_top_ten = TRUE) OR
            (pr.trigger_type = 'achievement' AND a.achievement_count::double precision >= pr.threshold)
          )
        ON CONFLICT (group_id, athlete_id, activity_id, rule_id) DO NOTHING
        "#,
        group_id
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn evaluate_points(db: &PgPool, athlete_id: i64) -> Result<(), String> {
    sqlx::query!(
        r#"
        INSERT INTO earned_points (group_id, athlete_id, activity_id, rule_id, points)
        SELECT
            gm.group_id,
            gm.athlete_id,
            a.id,
            pr.id,
            pr.points
        FROM group_members gm
        JOIN point_rules pr ON pr.group_id = gm.group_id
        JOIN activities    a ON a.athlete_id = gm.athlete_id
        WHERE gm.athlete_id = $1
          AND (pr.sport_type IS NULL OR pr.sport_type = a.sport_type)
          AND (
            (pr.trigger_type = 'distance_km' AND a.distance_m / 1000.0 >= pr.threshold) OR
            (pr.trigger_type = 'elevation_m' AND a.elevation_m         >= pr.threshold) OR
            (pr.trigger_type = 'kom'         AND a.has_kom = TRUE) OR
            (pr.trigger_type = 'top_ten'     AND a.has_top_ten = TRUE) OR
            (pr.trigger_type = 'achievement' AND a.achievement_count::double precision >= pr.threshold)
          )
        ON CONFLICT (group_id, athlete_id, activity_id, rule_id) DO NOTHING
        "#,
        athlete_id
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
