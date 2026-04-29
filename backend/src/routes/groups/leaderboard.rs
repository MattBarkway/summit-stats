//! Leaderboard, feed, and per-member detail views.

use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::membership::GroupMember;
use crate::extractors::strava::StravaClient;
use crate::models::api::badge::BadgeSummary;
use crate::models::api::cycle::{CycleBounds, LeaderboardQuery};
use crate::models::api::feed::FeedEntry;
use crate::models::api::group::MemberDetail;
use crate::models::api::leaderboard::{LeaderboardEntry, LeaderboardResponse};
use crate::models::api::rule::TriggerType;
use crate::repository::groups::fetch_cycle_bounds;
use crate::services::{activity_sync, badges, cache_purge, segment_challenges};
use axum::extract::{Path, Query, State};
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;
use uuid::Uuid;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/{id}/leaderboard", get(get_leaderboard))
        .route("/{id}/feed", get(get_feed))
        .route("/{id}/members/{athlete_id}", get(get_member))
}

async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    Query(q): Query<LeaderboardQuery>,
    StravaClient { client }: StravaClient,
    GroupMember {
        group_id,
        athlete_id,
    }: GroupMember,
) -> AppResult<Json<LeaderboardResponse>> {
    let live_bounds = fetch_cycle_bounds(&state.db, group_id).await?;

    let bounds = match (q.cycle_start, q.cycle_end) {
        (Some(s), Some(e)) => {
            if e <= s {
                return Err(AppError::BadRequest(
                    "cycle_end must be after cycle_start".into(),
                ));
            }
            CycleBounds {
                cycle_type: live_bounds.cycle_type,
                start_at: s,
                end_at: e,
            }
        }
        _ => {
            if let Err(e) =
                activity_sync::sync_activities(&state.db, athlete_id, client.api()).await
            {
                tracing::warn!("activity sync failed (continuing with cached data): {}", e);
            }
            if let Err(e) = badges::award_closed_cycle_badges(&state.db, group_id).await {
                tracing::warn!("cycle-end badge award failed: {}", e);
            }
            if let Err(e) = segment_challenges::resolve_expired(&state.db, group_id).await {
                tracing::warn!("segment challenge resolution failed: {}", e);
            }
            // Compliance: drop raw Strava cache older than 7 days. Runs after
            // sync + evaluate_points so we never delete data that hasn't yet
            // been snapshotted to earned_points.
            if let Err(e) = cache_purge::purge_stale_strava_cache(&state.db).await {
                tracing::warn!("stale-cache purge failed: {}", e);
            }
            live_bounds
        }
    };

    let rows = sqlx::query!(
        r#"
        SELECT
            u.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            COALESCE(SUM(ep.points), 0)::bigint    AS "total_points!",
            COUNT(DISTINCT ep.activity_id)::bigint AS "activity_count!"
        FROM group_members gm
        JOIN users u ON u.athlete_id = gm.athlete_id
        LEFT JOIN earned_points ep
          ON ep.group_id = gm.group_id
         AND ep.athlete_id = gm.athlete_id
        WHERE gm.group_id = $1
          AND (
            ep.id IS NULL
            OR (
              COALESCE(ep.activity_start_date, ep.earned_at) >= $2
              AND COALESCE(ep.activity_start_date, ep.earned_at) <  $3
            )
          )
        GROUP BY u.athlete_id, u.firstname, u.lastname, u.profile_url
        ORDER BY COALESCE(SUM(ep.points), 0) DESC, u.athlete_id
        "#,
        group_id,
        bounds.start_at,
        bounds.end_at,
    )
    .fetch_all(&state.db)
    .await?;

    let entries = rows
        .into_iter()
        .enumerate()
        .map(|(i, r)| LeaderboardEntry {
            rank: (i + 1) as i64,
            athlete_id: r.athlete_id,
            firstname: r.firstname,
            lastname: r.lastname,
            profile_url: r.profile_url,
            points: r.total_points,
            activity_count: r.activity_count,
        })
        .collect();

    Ok(Json(LeaderboardResponse {
        cycle_type: bounds.cycle_type,
        cycle_start: bounds.start_at,
        cycle_end: bounds.end_at,
        entries,
    }))
}

async fn get_feed(
    State(state): State<Arc<AppState>>,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<Vec<FeedEntry>>> {
    let rows = sqlx::query!(
        r#"
        SELECT
            ep.id,
            ep.earned_at,
            ep.points,
            u.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            ep.activity_id            AS "activity_id?",
            ep.activity_name          AS "activity_name?",
            ep.activity_sport_type    AS "activity_sport_type?",
            ep.activity_distance_m    AS "activity_distance_m?",
            ep.activity_moving_time_s AS "activity_moving_time_s?",
            ep.activity_elevation_m   AS "activity_elevation_m?",
            ep.activity_start_date    AS "activity_start_date?",
            pr.trigger_type AS "trigger_type!: TriggerType",
            pr.threshold,
            pr.sport_type   AS rule_sport_type
        FROM earned_points ep
        JOIN users u           ON u.athlete_id = ep.athlete_id
        JOIN point_rules pr    ON pr.id = ep.rule_id
        WHERE ep.group_id = $1
        ORDER BY COALESCE(ep.activity_start_date, ep.earned_at) DESC
        LIMIT 100
        "#,
        group_id
    )
    .fetch_all(&state.db)
    .await?;

    let feed = rows
        .into_iter()
        .map(|r| FeedEntry {
            id: r.id,
            earned_at: r.earned_at,
            points: r.points,
            athlete_id: r.athlete_id,
            firstname: r.firstname,
            lastname: r.lastname,
            profile_url: r.profile_url,
            activity_id: r.activity_id,
            activity_name: r.activity_name,
            activity_sport_type: r.activity_sport_type,
            activity_distance_m: r.activity_distance_m,
            activity_moving_time_s: r.activity_moving_time_s,
            activity_elevation_m: r.activity_elevation_m,
            activity_start_date: r.activity_start_date,
            trigger_type: r.trigger_type,
            threshold: r.threshold,
            rule_sport_type: r.rule_sport_type,
        })
        .collect();

    Ok(Json(feed))
}

async fn get_member(
    State(state): State<Arc<AppState>>,
    Path((_, target_athlete_id)): Path<(Uuid, i64)>,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<MemberDetail>> {
    let target_is_member = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1 AND athlete_id = $2)",
        group_id,
        target_athlete_id
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(false);
    if !target_is_member {
        return Err(AppError::NotFound("member not found"));
    }

    let bounds = fetch_cycle_bounds(&state.db, group_id).await?;

    let summary = sqlx::query!(
        r#"
        SELECT
            u.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            COALESCE(SUM(ep.points) FILTER (
                WHERE COALESCE(ep.activity_start_date, ep.earned_at) >= $3
                  AND COALESCE(ep.activity_start_date, ep.earned_at) <  $4
            ), 0)::bigint AS "points!",
            COUNT(DISTINCT ep.activity_id) FILTER (
                WHERE COALESCE(ep.activity_start_date, ep.earned_at) >= $3
                  AND COALESCE(ep.activity_start_date, ep.earned_at) <  $4
            )::bigint AS "activity_count!",
            COALESCE(SUM(DISTINCT ep.activity_distance_m), 0)::double precision  AS "total_distance_m!",
            COALESCE(SUM(DISTINCT ep.activity_elevation_m), 0)::double precision AS "total_elevation_m!"
        FROM users u
        LEFT JOIN earned_points ep
          ON ep.group_id = $1 AND ep.athlete_id = u.athlete_id
        WHERE u.athlete_id = $2
        GROUP BY u.athlete_id, u.firstname, u.lastname, u.profile_url
        "#,
        group_id,
        target_athlete_id,
        bounds.start_at,
        bounds.end_at,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("member not found"))?;

    let rank = sqlx::query_scalar!(
        r#"
        SELECT 1 + COUNT(*)::bigint AS "rank!"
        FROM (
            SELECT ep.athlete_id, COALESCE(SUM(ep.points), 0) AS pts
            FROM earned_points ep
            WHERE ep.group_id = $1
              AND COALESCE(ep.activity_start_date, ep.earned_at) >= $3
              AND COALESCE(ep.activity_start_date, ep.earned_at) <  $4
            GROUP BY ep.athlete_id
        ) totals
        WHERE totals.pts > $2
        "#,
        group_id,
        summary.points,
        bounds.start_at,
        bounds.end_at,
    )
    .fetch_one(&state.db)
    .await?;

    let events = sqlx::query!(
        r#"
        SELECT
            ep.id,
            ep.earned_at,
            ep.points,
            u.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            ep.activity_id            AS "activity_id?",
            ep.activity_name          AS "activity_name?",
            ep.activity_sport_type    AS "activity_sport_type?",
            ep.activity_distance_m    AS "activity_distance_m?",
            ep.activity_moving_time_s AS "activity_moving_time_s?",
            ep.activity_elevation_m   AS "activity_elevation_m?",
            ep.activity_start_date    AS "activity_start_date?",
            pr.trigger_type AS "trigger_type!: TriggerType",
            pr.threshold,
            pr.sport_type   AS rule_sport_type
        FROM earned_points ep
        JOIN users u           ON u.athlete_id = ep.athlete_id
        JOIN point_rules pr    ON pr.id = ep.rule_id
        WHERE ep.group_id = $1 AND ep.athlete_id = $2
        ORDER BY COALESCE(ep.activity_start_date, ep.earned_at) DESC
        LIMIT 200
        "#,
        group_id,
        target_athlete_id,
    )
    .fetch_all(&state.db)
    .await?
    .into_iter()
    .map(|r| FeedEntry {
        id: r.id,
        earned_at: r.earned_at,
        points: r.points,
        athlete_id: r.athlete_id,
        firstname: r.firstname,
        lastname: r.lastname,
        profile_url: r.profile_url,
        activity_id: r.activity_id,
        activity_name: r.activity_name,
        activity_sport_type: r.activity_sport_type,
        activity_distance_m: r.activity_distance_m,
        activity_moving_time_s: r.activity_moving_time_s,
        activity_elevation_m: r.activity_elevation_m,
        activity_start_date: r.activity_start_date,
        trigger_type: r.trigger_type,
        threshold: r.threshold,
        rule_sport_type: r.rule_sport_type,
    })
    .collect();

    let badges_list = sqlx::query!(
        r#"
        SELECT b.slug, b.name, b.description, b.icon, ub.awarded_at, ub.context
        FROM user_badges ub
        JOIN badges b ON b.id = ub.badge_id
        WHERE ub.athlete_id = $1
          AND (ub.group_id = $2 OR ub.group_id IS NULL)
        ORDER BY ub.awarded_at DESC
        "#,
        target_athlete_id,
        group_id,
    )
    .fetch_all(&state.db)
    .await?
    .into_iter()
    .map(|r| BadgeSummary {
        slug: r.slug,
        name: r.name,
        description: r.description,
        icon: r.icon,
        awarded_at: r.awarded_at,
        context: r.context,
    })
    .collect();

    Ok(Json(MemberDetail {
        athlete_id: summary.athlete_id,
        firstname: summary.firstname,
        lastname: summary.lastname,
        profile_url: summary.profile_url,
        rank,
        points: summary.points,
        activity_count: summary.activity_count,
        total_distance_m: summary.total_distance_m,
        total_elevation_m: summary.total_elevation_m,
        cycle_type: bounds.cycle_type,
        cycle_start: bounds.start_at,
        cycle_end: bounds.end_at,
        events,
        badges: badges_list,
    }))
}
