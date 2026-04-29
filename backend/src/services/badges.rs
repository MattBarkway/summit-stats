use serde_json::json;
use sqlx::PgPool;
use uuid::Uuid;

/// Award activity-derived badges (century ride, everester, first KOM, first
/// top-10). Idempotent via the UNIQUE index on user_badges.
pub async fn check_and_award_activity_badges(
    db: &PgPool,
    athlete_id: i64,
) -> Result<(), String> {
    // Century ride: any Ride ≥ 100 km.
    award_if(
        db,
        athlete_id,
        "century_ride",
        None,
        None,
        sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM activities
                WHERE athlete_id = $1
                  AND sport_type = 'Ride'
                  AND distance_m >= 100000
            ) AS "ok!"
            "#,
            athlete_id
        )
        .fetch_one(db)
        .await
        .map_err(|e| e.to_string())?,
    )
    .await?;

    // Everester: single ride ≥ 8848 m elevation.
    award_if(
        db,
        athlete_id,
        "everester",
        None,
        None,
        sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM activities
                WHERE athlete_id = $1 AND elevation_m >= 8848
            ) AS "ok!"
            "#,
            athlete_id
        )
        .fetch_one(db)
        .await
        .map_err(|e| e.to_string())?,
    )
    .await?;

    // First KOM ever recorded.
    award_if(
        db,
        athlete_id,
        "first_kom",
        None,
        None,
        sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM activities WHERE athlete_id = $1 AND has_kom = TRUE
            ) AS "ok!"
            "#,
            athlete_id
        )
        .fetch_one(db)
        .await
        .map_err(|e| e.to_string())?,
    )
    .await?;

    // First top-10 segment effort.
    award_if(
        db,
        athlete_id,
        "first_top_ten",
        None,
        None,
        sqlx::query_scalar!(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM activities WHERE athlete_id = $1 AND has_top_ten = TRUE
            ) AS "ok!"
            "#,
            athlete_id
        )
        .fetch_one(db)
        .await
        .map_err(|e| e.to_string())?,
    )
    .await?;

    Ok(())
}

/// Award podium badges for the previous closed cycle of a group, if not yet
/// awarded. Lazy-evaluated on each leaderboard load.
pub async fn award_closed_cycle_badges(db: &PgPool, group_id: Uuid) -> Result<(), String> {
    // Compute the *previous* cycle window: end_at = current cycle.start_at,
    // start_at = current.start_at - one cycle interval.
    let prev = sqlx::query!(
        r#"
        WITH live AS (
            SELECT g.cycle_type, cb.start_at AS curr_start
            FROM groups g
            CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
            WHERE g.id = $1
        )
        SELECT
            cycle_type::text AS "cycle_type!",
            curr_start       AS "curr_start!",
            CASE cycle_type
                WHEN 'weekly'    THEN curr_start - INTERVAL '7 days'
                WHEN 'monthly'   THEN curr_start - INTERVAL '1 month'
                WHEN 'quarterly' THEN curr_start - INTERVAL '3 months'
                WHEN 'yearly'    THEN curr_start - INTERVAL '1 year'
                WHEN 'all_time'  THEN '1970-01-01'::timestamptz
            END AS "prev_start!"
        FROM live
        "#,
        group_id
    )
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    let Some(prev) = prev else { return Ok(()) };
    if prev.cycle_type == "all_time" {
        return Ok(());
    }

    let prev_start = prev.prev_start;
    let prev_end = prev.curr_start;

    // Already awarded for this window? Check via cycle_winner sentinel.
    let already = sqlx::query_scalar!(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM user_badges ub
            JOIN badges b ON b.id = ub.badge_id
            WHERE ub.group_id = $1
              AND b.slug = 'cycle_winner'
              AND ub.context->>'cycle_start' = $2::text
        ) AS "ok!"
        "#,
        group_id,
        prev_start.to_string(),
    )
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    if already {
        return Ok(());
    }

    let podium = sqlx::query!(
        r#"
        SELECT ep.athlete_id, COALESCE(SUM(ep.points), 0)::bigint AS "pts!"
        FROM earned_points ep
        LEFT JOIN activities a ON a.id = ep.activity_id
        WHERE ep.group_id = $1
          AND COALESCE(a.start_date, ep.earned_at) >= $2
          AND COALESCE(a.start_date, ep.earned_at) <  $3
        GROUP BY ep.athlete_id
        HAVING COALESCE(SUM(ep.points), 0) > 0
        ORDER BY COALESCE(SUM(ep.points), 0) DESC, ep.athlete_id
        LIMIT 3
        "#,
        group_id,
        prev_start,
        prev_end,
    )
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    for (i, row) in podium.iter().enumerate() {
        let slug = if i == 0 { "cycle_winner" } else { "podium" };
        let context = json!({
            "cycle_start": prev_start.to_string(),
            "cycle_end":   prev_end.to_string(),
            "rank":        (i as i64) + 1,
            "points":      row.pts,
        });
        award_if(db, row.athlete_id, slug, Some(group_id), Some(context), true).await?;
    }

    Ok(())
}

/// Award a one-shot per-group badge by slug. Used for `group_founder` at
/// `create_group` time.
pub async fn award_group_badge(
    db: &PgPool,
    athlete_id: i64,
    group_id: Uuid,
    slug: &str,
) -> Result<(), String> {
    award_if(db, athlete_id, slug, Some(group_id), None, true).await
}

async fn award_if(
    db: &PgPool,
    athlete_id: i64,
    slug: &str,
    group_id: Option<Uuid>,
    context: Option<serde_json::Value>,
    qualified: bool,
) -> Result<(), String> {
    if !qualified {
        return Ok(());
    }
    sqlx::query!(
        r#"
        INSERT INTO user_badges (athlete_id, badge_id, group_id, context)
        SELECT $1, b.id, $3, $4
        FROM badges b
        WHERE b.slug = $2
        ON CONFLICT DO NOTHING
        "#,
        athlete_id,
        slug,
        group_id,
        context,
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}
