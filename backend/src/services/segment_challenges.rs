use sqlx::PgPool;
use time::OffsetDateTime;
use uuid::Uuid;

const MAX_PER_BATCH: i64 = 5;

/// Resolve any expired but unresolved challenges for a group. Lazy — called
/// from `get_leaderboard` and challenge listing endpoints. Caps at
/// MAX_PER_BATCH per call to keep response time bounded.
pub async fn resolve_expired(db: &PgPool, group_id: Uuid) -> Result<(), String> {
    let challenges = sqlx::query!(
        r#"
        SELECT id, segment_id, starts_at, ends_at,
               points_winner, points_top3, points_finish
        FROM segment_challenges
        WHERE group_id = $1 AND ends_at < NOW() AND resolved_at IS NULL
        ORDER BY ends_at
        LIMIT $2
        "#,
        group_id,
        MAX_PER_BATCH,
    )
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    for c in challenges {
        resolve_one(
            db,
            group_id,
            c.id,
            c.segment_id,
            c.starts_at,
            c.ends_at,
            c.points_winner,
            c.points_top3,
            c.points_finish,
        )
        .await?;
    }

    Ok(())
}

async fn resolve_one(
    db: &PgPool,
    group_id: Uuid,
    challenge_id: Uuid,
    segment_id: i64,
    starts_at: OffsetDateTime,
    ends_at: OffsetDateTime,
    points_winner: i32,
    points_top3: i32,
    points_finish: i32,
) -> Result<(), String> {
    // Best effort per group member within the window.
    let bests = sqlx::query!(
        r#"
        SELECT
            se.athlete_id,
            MIN(se.elapsed_time_s)::int4 AS "best!",
            (
                SELECT se2.activity_id
                FROM segment_efforts se2
                WHERE se2.segment_id = $1
                  AND se2.athlete_id = se.athlete_id
                  AND se2.start_date >= $2
                  AND se2.start_date <  $3
                ORDER BY se2.elapsed_time_s ASC
                LIMIT 1
            ) AS "winning_activity!"
        FROM segment_efforts se
        JOIN group_members gm
          ON gm.athlete_id = se.athlete_id AND gm.group_id = $4
        WHERE se.segment_id = $1
          AND se.start_date >= $2
          AND se.start_date <  $3
        GROUP BY se.athlete_id
        ORDER BY MIN(se.elapsed_time_s) ASC
        "#,
        segment_id,
        starts_at,
        ends_at,
        group_id,
    )
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    if bests.is_empty() {
        // Mark resolved with no awards.
        sqlx::query!(
            "UPDATE segment_challenges SET resolved_at = NOW() WHERE id = $1",
            challenge_id
        )
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Ensure synthetic point_rule exists for this group.
    let rule_id = sqlx::query_scalar!(
        r#"
        WITH ins AS (
            INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
            VALUES ($1, 'segment_challenge'::text::point_trigger, 0, 0, NULL)
            ON CONFLICT (group_id, trigger_type, threshold, sport_type) DO NOTHING
            RETURNING id
        )
        SELECT id AS "id!" FROM ins
        UNION ALL
        SELECT id FROM point_rules
        WHERE group_id = $1 AND trigger_type = 'segment_challenge'
        LIMIT 1
        "#,
        group_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    for (i, row) in bests.iter().enumerate() {
        let rank = (i + 1) as i32;
        let pts = if rank == 1 {
            points_winner
        } else if rank <= 3 {
            points_top3
        } else {
            points_finish
        };

        sqlx::query!(
            r#"
            INSERT INTO segment_challenge_results (challenge_id, athlete_id, best_time_s, rank)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (challenge_id, athlete_id) DO UPDATE
              SET best_time_s = EXCLUDED.best_time_s,
                  rank = EXCLUDED.rank
            "#,
            challenge_id,
            row.athlete_id,
            row.best,
            rank,
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        sqlx::query!(
            r#"
            INSERT INTO earned_points (group_id, athlete_id, activity_id, rule_id, points)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (group_id, athlete_id, activity_id, rule_id) DO UPDATE
              SET points = EXCLUDED.points
            "#,
            group_id,
            row.athlete_id,
            row.winning_activity,
            rule_id,
            pts,
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query!(
        "UPDATE segment_challenges SET resolved_at = NOW() WHERE id = $1",
        challenge_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
