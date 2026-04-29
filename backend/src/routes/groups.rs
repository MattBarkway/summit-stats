use crate::AppState;
use crate::extractors::current_user::CurrentUser;
use crate::extractors::strava::StravaClient;
use crate::services::activity_sync;
use crate::services::badges;
use crate::services::segment_challenges;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use time::OffsetDateTime;
use uuid::Uuid;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_group).get(list_groups))
        .route("/preview/{code}", get(get_preview))
        .route("/join", post(join_group))
        .route(
            "/{id}",
            get(get_group).delete(delete_group).patch(update_group),
        )
        .route("/{id}/leave", post(leave_group))
        .route("/{id}/rules", get(list_rules).post(create_rule))
        .route(
            "/{id}/rules/{rule_id}",
            axum::routing::patch(update_rule).delete(delete_rule),
        )
        .route("/{id}/challenges", get(list_challenges).post(create_challenge))
        .route(
            "/{id}/challenges/{cid}",
            axum::routing::delete(delete_challenge),
        )
        .route("/{id}/leaderboard", get(get_leaderboard))
        .route("/{id}/feed", get(get_feed))
        .route("/{id}/members/{athlete_id}", get(get_member))
}

#[derive(Deserialize)]
struct CreateGroupRequest {
    name: String,
    description: Option<String>,
}

#[derive(Serialize)]
struct GroupSummary {
    id: Uuid,
    name: String,
    description: Option<String>,
    icon_url: Option<String>,
    member_count: i64,
    my_points: i64,
    cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
struct GroupDetail {
    id: Uuid,
    name: String,
    description: Option<String>,
    icon_url: Option<String>,
    invite_code: String,
    owner_id: i64,
    members: Vec<MemberSummary>,
    cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
struct GroupPreview {
    name: String,
    icon_url: Option<String>,
    member_count: i64,
    owner_name: String,
    cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
struct Rule {
    id: Uuid,
    trigger_type: String,
    threshold: f64,
    points: i32,
    sport_type: Option<String>,
}

#[derive(Deserialize)]
struct CreateRuleRequest {
    trigger_type: String,
    threshold: f64,
    points: i32,
    sport_type: Option<String>,
}

#[derive(Deserialize)]
struct UpdateRuleRequest {
    threshold: Option<f64>,
    points: Option<i32>,
}

#[derive(Deserialize)]
struct UpdateGroupRequest {
    name: Option<String>,
    description: Option<String>,
    icon_url: Option<String>,
}

#[derive(Serialize)]
struct MemberSummary {
    athlete_id: i64,
    firstname: Option<String>,
    lastname: Option<String>,
    profile_url: Option<String>,
}

#[derive(Deserialize)]
struct JoinGroupRequest {
    invite_code: String,
}

#[derive(Serialize)]
struct FeedEntry {
    id: Uuid,
    #[serde(with = "time::serde::rfc3339")]
    earned_at: OffsetDateTime,
    points: i32,
    athlete_id: i64,
    firstname: Option<String>,
    lastname: Option<String>,
    profile_url: Option<String>,
    activity_id: Option<i64>,
    activity_name: Option<String>,
    activity_sport_type: Option<String>,
    activity_distance_m: Option<f64>,
    activity_moving_time_s: Option<i32>,
    activity_elevation_m: Option<f64>,
    #[serde(with = "time::serde::rfc3339::option")]
    activity_start_date: Option<OffsetDateTime>,
    trigger_type: String,
    threshold: f64,
    rule_sport_type: Option<String>,
}

#[derive(Serialize)]
struct BadgeSummary {
    slug: String,
    name: String,
    description: String,
    icon: String,
    #[serde(with = "time::serde::rfc3339")]
    awarded_at: OffsetDateTime,
    context: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct MemberDetail {
    athlete_id: i64,
    firstname: Option<String>,
    lastname: Option<String>,
    profile_url: Option<String>,
    rank: i64,
    points: i64,
    activity_count: i64,
    total_distance_m: f64,
    total_elevation_m: f64,
    cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    cycle_end: OffsetDateTime,
    events: Vec<FeedEntry>,
    badges: Vec<BadgeSummary>,
}

#[derive(Serialize)]
struct LeaderboardEntry {
    rank: i64,
    athlete_id: i64,
    firstname: Option<String>,
    lastname: Option<String>,
    profile_url: Option<String>,
    points: i64,
    activity_count: i64,
}

#[derive(Serialize)]
struct LeaderboardResponse {
    cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    cycle_end: OffsetDateTime,
    entries: Vec<LeaderboardEntry>,
}

struct CycleBounds {
    cycle_type: String,
    start_at: OffsetDateTime,
    end_at: OffsetDateTime,
}

async fn fetch_cycle_bounds(
    db: &PgPool,
    group_id: Uuid,
) -> Result<CycleBounds, (StatusCode, String)> {
    let row = sqlx::query!(
        r#"
        SELECT
            g.cycle_type::text AS "cycle_type!",
            cb.start_at        AS "start_at!",
            cb.end_at          AS "end_at!"
        FROM groups g
        CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
        WHERE g.id = $1
        "#,
        group_id
    )
    .fetch_optional(db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;

    Ok(CycleBounds {
        cycle_type: row.cycle_type,
        start_at: row.start_at,
        end_at: row.end_at,
    })
}

async fn create_group(
    State(state): State<Arc<AppState>>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<CreateGroupRequest>,
) -> Result<Json<GroupDetail>, (StatusCode, String)> {
    if req.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "name required".into()));
    }

    let mut tx = state.db.begin().await.map_err(internal)?;

    let group = sqlx::query!(
        r#"
        INSERT INTO groups (name, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, invite_code
        "#,
        req.name,
        req.description,
        athlete_id,
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(internal)?;

    sqlx::query!(
        "INSERT INTO group_members (group_id, athlete_id) VALUES ($1, $2)",
        group.id,
        athlete_id,
    )
    .execute(&mut *tx)
    .await
    .map_err(internal)?;

    seed_default_rules(&mut *tx, group.id).await?;

    tx.commit().await.map_err(internal)?;

    if let Err(e) = badges::award_group_badge(
        &state.db,
        athlete_id,
        group.id,
        "group_founder",
    )
    .await
    {
        tracing::warn!("group_founder badge award failed: {}", e);
    }

    fetch_group_detail(&state.db, group.id).await
}

async fn seed_default_rules(
    tx: &mut sqlx::PgConnection,
    group_id: Uuid,
) -> Result<(), (StatusCode, String)> {
    let rules: &[(&str, f64, i32, Option<&str>)] = &[
        ("distance_km", 50.0, 100, Some("Ride")),
        ("distance_km", 100.0, 250, Some("Ride")),
        ("distance_km", 10.0, 50, Some("Run")),
        ("distance_km", 21.1, 150, Some("Run")),
        ("elevation_m", 500.0, 50, None),
        ("kom", 1.0, 250, None),
        ("top_ten", 1.0, 100, None),
    ];

    for (trigger, threshold, points, sport) in rules {
        sqlx::query(
            r#"
            INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
            VALUES ($1, $2::point_trigger, $3, $4, $5)
            "#,
        )
        .bind(group_id)
        .bind(*trigger)
        .bind(*threshold)
        .bind(*points)
        .bind(*sport)
        .execute(&mut *tx)
        .await
        .map_err(internal)?;
    }
    Ok(())
}

async fn list_groups(
    State(state): State<Arc<AppState>>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<Vec<GroupSummary>>, (StatusCode, String)> {
    let rows = sqlx::query!(
        r#"
        SELECT
            g.id,
            g.name,
            g.description,
            g.icon_url,
            g.cycle_type::text AS "cycle_type!",
            cb.start_at        AS "cycle_start!",
            cb.end_at          AS "cycle_end!",
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS "member_count!",
            COALESCE((
                SELECT SUM(ep.points)::bigint
                FROM earned_points ep
                LEFT JOIN activities a ON a.id = ep.activity_id
                WHERE ep.group_id = g.id
                  AND ep.athlete_id = $1
                  AND COALESCE(a.start_date, ep.earned_at) >= cb.start_at
                  AND COALESCE(a.start_date, ep.earned_at) <  cb.end_at
            ), 0) AS "my_points!"
        FROM groups g
        CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
        JOIN group_members gm ON gm.group_id = g.id
        WHERE gm.athlete_id = $1
        ORDER BY g.created_at DESC
        "#,
        athlete_id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let groups = rows
        .into_iter()
        .map(|r| GroupSummary {
            id: r.id,
            name: r.name,
            description: r.description,
            icon_url: r.icon_url,
            member_count: r.member_count,
            my_points: r.my_points,
            cycle_type: r.cycle_type,
            cycle_start: r.cycle_start,
            cycle_end: r.cycle_end,
        })
        .collect();

    Ok(Json(groups))
}

async fn get_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<GroupDetail>, (StatusCode, String)> {
    require_member(&state.db, id, athlete_id).await?;
    fetch_group_detail(&state.db, id).await
}

async fn fetch_group_detail(
    db: &PgPool,
    id: Uuid,
) -> Result<Json<GroupDetail>, (StatusCode, String)> {
    let g = sqlx::query!(
        r#"
        SELECT
            g.id,
            g.name,
            g.description,
            g.icon_url,
            g.invite_code,
            g.owner_id,
            g.cycle_type::text AS "cycle_type!",
            cb.start_at        AS "cycle_start!",
            cb.end_at          AS "cycle_end!"
        FROM groups g
        CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
        WHERE g.id = $1
        "#,
        id
    )
    .fetch_optional(db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;

    let members = sqlx::query!(
        r#"
        SELECT u.athlete_id, u.firstname, u.lastname, u.profile_url
        FROM group_members gm
        JOIN users u ON u.athlete_id = gm.athlete_id
        WHERE gm.group_id = $1
        ORDER BY gm.joined_at
        "#,
        id
    )
    .fetch_all(db)
    .await
    .map_err(internal)?
    .into_iter()
    .map(|r| MemberSummary {
        athlete_id: r.athlete_id,
        firstname: r.firstname,
        lastname: r.lastname,
        profile_url: r.profile_url,
    })
    .collect();

    Ok(Json(GroupDetail {
        id: g.id,
        name: g.name,
        description: g.description,
        icon_url: g.icon_url,
        invite_code: g.invite_code,
        owner_id: g.owner_id,
        members,
        cycle_type: g.cycle_type,
        cycle_start: g.cycle_start,
        cycle_end: g.cycle_end,
    }))
}

async fn update_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<UpdateGroupRequest>,
) -> Result<Json<GroupDetail>, (StatusCode, String)> {
    let owner = sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;

    if owner != athlete_id {
        return Err((StatusCode::FORBIDDEN, "only owner can edit".into()));
    }

    let trimmed_name = req.name.as_ref().map(|s| s.trim().to_string());
    if let Some(n) = &trimmed_name {
        if n.is_empty() {
            return Err((StatusCode::BAD_REQUEST, "name cannot be empty".into()));
        }
    }

    let icon_url = match req.icon_url.as_ref().map(|s| s.trim()) {
        Some("") => Some(None), // explicit clear
        Some(url) if url.starts_with("https://") => Some(Some(url.to_string())),
        Some(_) => {
            return Err((
                StatusCode::BAD_REQUEST,
                "icon_url must start with https://".into(),
            ));
        }
        None => None, // unchanged
    };

    sqlx::query!(
        r#"
        UPDATE groups
        SET
            name        = COALESCE($2, name),
            description = CASE WHEN $3::boolean THEN $4 ELSE description END,
            icon_url    = CASE WHEN $5::boolean THEN $6 ELSE icon_url END
        WHERE id = $1
        "#,
        id,
        trimmed_name,
        req.description.is_some(),
        req.description.as_deref(),
        icon_url.is_some(),
        icon_url.flatten(),
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;

    fetch_group_detail(&state.db, id).await
}

async fn get_preview(
    State(state): State<Arc<AppState>>,
    Path(code): Path<String>,
) -> Result<Json<GroupPreview>, (StatusCode, String)> {
    let row = sqlx::query!(
        r#"
        SELECT
            g.name,
            g.icon_url,
            g.cycle_type::text AS "cycle_type!",
            cb.start_at        AS "cycle_start!",
            cb.end_at          AS "cycle_end!",
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS "member_count!",
            COALESCE(
                NULLIF(TRIM(BOTH ' ' FROM CONCAT_WS(' ', u.firstname, u.lastname)), ''),
                'Group owner'
            ) AS "owner_name!"
        FROM groups g
        CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
        JOIN users u ON u.athlete_id = g.owner_id
        WHERE g.invite_code = $1
        "#,
        code.trim()
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "invite code not found".into()))?;

    Ok(Json(GroupPreview {
        name: row.name,
        icon_url: row.icon_url,
        member_count: row.member_count,
        owner_name: row.owner_name,
        cycle_type: row.cycle_type,
        cycle_start: row.cycle_start,
        cycle_end: row.cycle_end,
    }))
}

async fn join_group(
    State(state): State<Arc<AppState>>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<JoinGroupRequest>,
) -> Result<Json<GroupDetail>, (StatusCode, String)> {
    let group = sqlx::query!(
        "SELECT id FROM groups WHERE invite_code = $1",
        req.invite_code.trim()
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "invite code not found".into()))?;

    sqlx::query!(
        r#"
        INSERT INTO group_members (group_id, athlete_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        "#,
        group.id,
        athlete_id,
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;

    fetch_group_detail(&state.db, group.id).await
}

async fn leave_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<StatusCode, (StatusCode, String)> {
    let owner = sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;

    if owner == athlete_id {
        return Err((
            StatusCode::FORBIDDEN,
            "owner must delete the group instead of leaving".into(),
        ));
    }

    sqlx::query!(
        "DELETE FROM group_members WHERE group_id = $1 AND athlete_id = $2",
        id,
        athlete_id,
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;

    Ok(StatusCode::NO_CONTENT)
}

async fn delete_group(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<StatusCode, (StatusCode, String)> {
    let owner = sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", id)
        .fetch_optional(&state.db)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;

    if owner != athlete_id {
        return Err((StatusCode::FORBIDDEN, "only owner can delete".into()));
    }

    sqlx::query!("DELETE FROM groups WHERE id = $1", id)
        .execute(&state.db)
        .await
        .map_err(internal)?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Deserialize)]
struct LeaderboardQuery {
    #[serde(default, with = "time::serde::rfc3339::option")]
    cycle_start: Option<OffsetDateTime>,
    #[serde(default, with = "time::serde::rfc3339::option")]
    cycle_end: Option<OffsetDateTime>,
}

async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Query(q): Query<LeaderboardQuery>,
    StravaClient { client }: StravaClient,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<LeaderboardResponse>, (StatusCode, String)> {
    require_member(&state.db, id, athlete_id).await?;

    let live_bounds = fetch_cycle_bounds(&state.db, id).await?;

    // Past-cycle override: if both start+end supplied, use them. Skip the live
    // sync since past cycles don't change. Otherwise sync + use current cycle.
    let bounds = match (q.cycle_start, q.cycle_end) {
        (Some(s), Some(e)) => {
            if e <= s {
                return Err((
                    StatusCode::BAD_REQUEST,
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
            if let Err(e) = badges::award_closed_cycle_badges(&state.db, id).await {
                tracing::warn!("cycle-end badge award failed: {}", e);
            }
            if let Err(e) = segment_challenges::resolve_expired(&state.db, id).await {
                tracing::warn!("segment challenge resolution failed: {}", e);
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
        LEFT JOIN activities a
          ON a.id = ep.activity_id
        WHERE gm.group_id = $1
          AND (
            ep.id IS NULL
            OR (
              COALESCE(a.start_date, ep.earned_at) >= $2
              AND COALESCE(a.start_date, ep.earned_at) <  $3
            )
          )
        GROUP BY u.athlete_id, u.firstname, u.lastname, u.profile_url
        ORDER BY COALESCE(SUM(ep.points), 0) DESC, u.athlete_id
        "#,
        id,
        bounds.start_at,
        bounds.end_at,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

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
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<Vec<FeedEntry>>, (StatusCode, String)> {
    require_member(&state.db, id, athlete_id).await?;

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
            a.id            AS "activity_id?",
            a.name          AS "activity_name?",
            a.sport_type    AS "activity_sport_type?",
            a.distance_m    AS "activity_distance_m?",
            a.moving_time_s AS "activity_moving_time_s?",
            a.elevation_m   AS "activity_elevation_m?",
            a.start_date    AS "activity_start_date?",
            pr.trigger_type::text AS "trigger_type!",
            pr.threshold,
            pr.sport_type   AS rule_sport_type
        FROM earned_points ep
        JOIN users u           ON u.athlete_id = ep.athlete_id
        JOIN point_rules pr    ON pr.id = ep.rule_id
        LEFT JOIN activities a ON a.id = ep.activity_id
        WHERE ep.group_id = $1
        ORDER BY COALESCE(a.start_date, ep.earned_at) DESC
        LIMIT 100
        "#,
        id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

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
    Path((group_id, athlete_id)): Path<(Uuid, i64)>,
    CurrentUser {
        athlete_id: caller_athlete_id,
    }: CurrentUser,
) -> Result<Json<MemberDetail>, (StatusCode, String)> {
    require_member(&state.db, group_id, caller_athlete_id).await?;
    require_member(&state.db, group_id, athlete_id).await?;

    let bounds = fetch_cycle_bounds(&state.db, group_id).await?;

    let summary = sqlx::query!(
        r#"
        SELECT
            u.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            COALESCE(SUM(ep.points) FILTER (
                WHERE COALESCE(a.start_date, ep.earned_at) >= $3
                  AND COALESCE(a.start_date, ep.earned_at) <  $4
            ), 0)::bigint AS "points!",
            COUNT(DISTINCT ep.activity_id) FILTER (
                WHERE COALESCE(a.start_date, ep.earned_at) >= $3
                  AND COALESCE(a.start_date, ep.earned_at) <  $4
            )::bigint AS "activity_count!",
            COALESCE(SUM(DISTINCT a.distance_m), 0)::double precision  AS "total_distance_m!",
            COALESCE(SUM(DISTINCT a.elevation_m), 0)::double precision AS "total_elevation_m!"
        FROM users u
        LEFT JOIN earned_points ep
          ON ep.group_id = $1 AND ep.athlete_id = u.athlete_id
        LEFT JOIN activities a
          ON a.id = ep.activity_id
        WHERE u.athlete_id = $2
        GROUP BY u.athlete_id, u.firstname, u.lastname, u.profile_url
        "#,
        group_id,
        athlete_id,
        bounds.start_at,
        bounds.end_at,
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "member not found".into()))?;

    let rank = sqlx::query_scalar!(
        r#"
        SELECT 1 + COUNT(*)::bigint AS "rank!"
        FROM (
            SELECT ep.athlete_id, COALESCE(SUM(ep.points), 0) AS pts
            FROM earned_points ep
            LEFT JOIN activities a ON a.id = ep.activity_id
            WHERE ep.group_id = $1
              AND COALESCE(a.start_date, ep.earned_at) >= $3
              AND COALESCE(a.start_date, ep.earned_at) <  $4
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
    .await
    .map_err(internal)?;

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
            a.id            AS "activity_id?",
            a.name          AS "activity_name?",
            a.sport_type    AS "activity_sport_type?",
            a.distance_m    AS "activity_distance_m?",
            a.moving_time_s AS "activity_moving_time_s?",
            a.elevation_m   AS "activity_elevation_m?",
            a.start_date    AS "activity_start_date?",
            pr.trigger_type::text AS "trigger_type!",
            pr.threshold,
            pr.sport_type   AS rule_sport_type
        FROM earned_points ep
        JOIN users u           ON u.athlete_id = ep.athlete_id
        JOIN point_rules pr    ON pr.id = ep.rule_id
        LEFT JOIN activities a ON a.id = ep.activity_id
        WHERE ep.group_id = $1 AND ep.athlete_id = $2
        ORDER BY COALESCE(a.start_date, ep.earned_at) DESC
        LIMIT 200
        "#,
        group_id,
        athlete_id,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?
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

    let badges = sqlx::query!(
        r#"
        SELECT b.slug, b.name, b.description, b.icon, ub.awarded_at, ub.context
        FROM user_badges ub
        JOIN badges b ON b.id = ub.badge_id
        WHERE ub.athlete_id = $1
          AND (ub.group_id = $2 OR ub.group_id IS NULL)
        ORDER BY ub.awarded_at DESC
        "#,
        athlete_id,
        group_id,
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?
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
        badges,
    }))
}

async fn require_owner(
    db: &PgPool,
    group_id: Uuid,
    athlete_id: i64,
) -> Result<(), (StatusCode, String)> {
    let owner = sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", group_id)
        .fetch_optional(db)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "group not found".into()))?;
    if owner != athlete_id {
        return Err((StatusCode::FORBIDDEN, "owner only".into()));
    }
    Ok(())
}

const VALID_TRIGGERS: &[&str] = &[
    "distance_km",
    "elevation_m",
    "kom",
    "top_ten",
    "achievement",
];

async fn list_rules(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<Vec<Rule>>, (StatusCode, String)> {
    require_member(&state.db, id, athlete_id).await?;

    let rows = sqlx::query!(
        r#"
        SELECT id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        FROM point_rules
        WHERE group_id = $1
        ORDER BY trigger_type, threshold
        "#,
        id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let rules = rows
        .into_iter()
        .map(|r| Rule {
            id: r.id,
            trigger_type: r.trigger_type,
            threshold: r.threshold,
            points: r.points,
            sport_type: r.sport_type,
        })
        .collect();

    Ok(Json(rules))
}

async fn create_rule(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<CreateRuleRequest>,
) -> Result<Json<Rule>, (StatusCode, String)> {
    require_owner(&state.db, id, athlete_id).await?;

    if !VALID_TRIGGERS.contains(&req.trigger_type.as_str()) {
        return Err((StatusCode::BAD_REQUEST, "invalid trigger_type".into()));
    }
    if req.points < 0 {
        return Err((StatusCode::BAD_REQUEST, "points must be >= 0".into()));
    }
    let sport = req.sport_type.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty());

    let row = sqlx::query!(
        r#"
        INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
        VALUES ($1, $2::text::point_trigger, $3, $4, $5)
        RETURNING id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        "#,
        id,
        req.trigger_type,
        req.threshold,
        req.points,
        sport,
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(db_err) = &e {
            if db_err.is_unique_violation() {
                return (StatusCode::CONFLICT, "duplicate rule".into());
            }
        }
        internal(e)
    })?;

    activity_sync::evaluate_for_group(&state.db, id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(Rule {
        id: row.id,
        trigger_type: row.trigger_type,
        threshold: row.threshold,
        points: row.points,
        sport_type: row.sport_type,
    }))
}

async fn update_rule(
    State(state): State<Arc<AppState>>,
    Path((group_id, rule_id)): Path<(Uuid, Uuid)>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<UpdateRuleRequest>,
) -> Result<Json<Rule>, (StatusCode, String)> {
    require_owner(&state.db, group_id, athlete_id).await?;

    let existing = sqlx::query!(
        r#"
        SELECT trigger_type::text AS "trigger_type!", threshold, points
        FROM point_rules
        WHERE id = $1 AND group_id = $2
        "#,
        rule_id,
        group_id,
    )
    .fetch_optional(&state.db)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "rule not found".into()))?;

    let new_threshold = req.threshold.unwrap_or(existing.threshold);
    let new_points = req.points.unwrap_or(existing.points);
    let threshold_changed = req.threshold.is_some() && req.threshold != Some(existing.threshold);

    sqlx::query!(
        "UPDATE point_rules SET threshold = $1, points = $2 WHERE id = $3",
        new_threshold,
        new_points,
        rule_id,
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;

    if threshold_changed {
        // Threshold changed → invalidate prior awards, re-evaluate.
        sqlx::query!("DELETE FROM earned_points WHERE rule_id = $1", rule_id)
            .execute(&state.db)
            .await
            .map_err(internal)?;
        activity_sync::evaluate_for_group(&state.db, group_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    } else if req.points.is_some() {
        // Points-only change → keep awards, update their value.
        sqlx::query!(
            "UPDATE earned_points SET points = $1 WHERE rule_id = $2",
            new_points,
            rule_id,
        )
        .execute(&state.db)
        .await
        .map_err(internal)?;
    }

    let row = sqlx::query!(
        r#"
        SELECT id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        FROM point_rules WHERE id = $1
        "#,
        rule_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(internal)?;

    Ok(Json(Rule {
        id: row.id,
        trigger_type: row.trigger_type,
        threshold: row.threshold,
        points: row.points,
        sport_type: row.sport_type,
    }))
}

async fn delete_rule(
    State(state): State<Arc<AppState>>,
    Path((group_id, rule_id)): Path<(Uuid, Uuid)>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<StatusCode, (StatusCode, String)> {
    require_owner(&state.db, group_id, athlete_id).await?;
    let result = sqlx::query!(
        "DELETE FROM point_rules WHERE id = $1 AND group_id = $2",
        rule_id,
        group_id,
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "rule not found".into()));
    }
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Serialize)]
struct ChallengeResultEntry {
    athlete_id: i64,
    firstname: Option<String>,
    lastname: Option<String>,
    profile_url: Option<String>,
    best_time_s: Option<i32>,
    rank: Option<i32>,
}

#[derive(Serialize)]
struct Challenge {
    id: Uuid,
    segment_id: i64,
    segment_name: String,
    #[serde(with = "time::serde::rfc3339")]
    starts_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    ends_at: OffsetDateTime,
    points_winner: i32,
    points_top3: i32,
    points_finish: i32,
    #[serde(with = "time::serde::rfc3339::option")]
    resolved_at: Option<OffsetDateTime>,
    results: Vec<ChallengeResultEntry>,
}

#[derive(Deserialize)]
struct CreateChallengeRequest {
    segment_id: i64,
    #[serde(with = "time::serde::rfc3339")]
    ends_at: OffsetDateTime,
    points_winner: Option<i32>,
    points_top3: Option<i32>,
    points_finish: Option<i32>,
}

async fn list_challenges(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    StravaClient { client: _ }: StravaClient,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<Vec<Challenge>>, (StatusCode, String)> {
    require_member(&state.db, id, athlete_id).await?;

    if let Err(e) = segment_challenges::resolve_expired(&state.db, id).await {
        tracing::warn!("challenge resolution failed: {}", e);
    }

    let rows = sqlx::query!(
        r#"
        SELECT id, segment_id, segment_name, starts_at, ends_at,
               points_winner, points_top3, points_finish, resolved_at
        FROM segment_challenges
        WHERE group_id = $1
        ORDER BY ends_at DESC
        "#,
        id
    )
    .fetch_all(&state.db)
    .await
    .map_err(internal)?;

    let mut challenges = Vec::with_capacity(rows.len());
    for c in rows {
        let results = sqlx::query!(
            r#"
            SELECT
                r.athlete_id,
                u.firstname,
                u.lastname,
                u.profile_url,
                r.best_time_s,
                r.rank
            FROM segment_challenge_results r
            JOIN users u ON u.athlete_id = r.athlete_id
            WHERE r.challenge_id = $1
            ORDER BY r.rank
            "#,
            c.id
        )
        .fetch_all(&state.db)
        .await
        .map_err(internal)?;

        // For active challenges (not yet resolved) compute live standings from
        // the segment_efforts cache so members see progress.
        let entries = if c.resolved_at.is_some() {
            results
                .into_iter()
                .map(|r| ChallengeResultEntry {
                    athlete_id: r.athlete_id,
                    firstname: r.firstname,
                    lastname: r.lastname,
                    profile_url: r.profile_url,
                    best_time_s: Some(r.best_time_s),
                    rank: Some(r.rank),
                })
                .collect()
        } else {
            sqlx::query!(
                r#"
                SELECT
                    se.athlete_id,
                    u.firstname,
                    u.lastname,
                    u.profile_url,
                    MIN(se.elapsed_time_s)::int4 AS "best!"
                FROM segment_efforts se
                JOIN group_members gm
                  ON gm.athlete_id = se.athlete_id AND gm.group_id = $1
                JOIN users u ON u.athlete_id = se.athlete_id
                WHERE se.segment_id = $2
                  AND se.start_date >= $3
                  AND se.start_date <  $4
                GROUP BY se.athlete_id, u.firstname, u.lastname, u.profile_url
                ORDER BY MIN(se.elapsed_time_s) ASC
                "#,
                id,
                c.segment_id,
                c.starts_at,
                c.ends_at,
            )
            .fetch_all(&state.db)
            .await
            .map_err(internal)?
            .into_iter()
            .enumerate()
            .map(|(i, r)| ChallengeResultEntry {
                athlete_id: r.athlete_id,
                firstname: r.firstname,
                lastname: r.lastname,
                profile_url: r.profile_url,
                best_time_s: Some(r.best),
                rank: Some((i + 1) as i32),
            })
            .collect()
        };

        challenges.push(Challenge {
            id: c.id,
            segment_id: c.segment_id,
            segment_name: c.segment_name,
            starts_at: c.starts_at,
            ends_at: c.ends_at,
            points_winner: c.points_winner,
            points_top3: c.points_top3,
            points_finish: c.points_finish,
            resolved_at: c.resolved_at,
            results: entries,
        });
    }

    Ok(Json(challenges))
}

async fn create_challenge(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    StravaClient { client }: StravaClient,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<CreateChallengeRequest>,
) -> Result<Json<Challenge>, (StatusCode, String)> {
    require_owner(&state.db, id, athlete_id).await?;

    if req.ends_at <= OffsetDateTime::now_utc() {
        return Err((
            StatusCode::BAD_REQUEST,
            "ends_at must be in the future".into(),
        ));
    }

    use strava_wrapper::prelude::*;
    let segment = client
        .api()
        .segments()
        .get()
        .id(req.segment_id as u64)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("segment fetch: {:?}", e)))?;

    let segment_name = segment
        .name
        .clone()
        .ok_or((StatusCode::BAD_GATEWAY, "segment missing name".into()))?;

    let row = sqlx::query!(
        r#"
        INSERT INTO segment_challenges
          (group_id, segment_id, segment_name, ends_at,
           points_winner, points_top3, points_finish, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, segment_id, segment_name, starts_at, ends_at,
                  points_winner, points_top3, points_finish, resolved_at
        "#,
        id,
        req.segment_id,
        segment_name,
        req.ends_at,
        req.points_winner.unwrap_or(500),
        req.points_top3.unwrap_or(200),
        req.points_finish.unwrap_or(50),
        athlete_id,
    )
    .fetch_one(&state.db)
    .await
    .map_err(internal)?;

    Ok(Json(Challenge {
        id: row.id,
        segment_id: row.segment_id,
        segment_name: row.segment_name,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        points_winner: row.points_winner,
        points_top3: row.points_top3,
        points_finish: row.points_finish,
        resolved_at: row.resolved_at,
        results: Vec::new(),
    }))
}

async fn delete_challenge(
    State(state): State<Arc<AppState>>,
    Path((group_id, cid)): Path<(Uuid, Uuid)>,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<StatusCode, (StatusCode, String)> {
    require_owner(&state.db, group_id, athlete_id).await?;
    let result = sqlx::query!(
        "DELETE FROM segment_challenges WHERE id = $1 AND group_id = $2",
        cid,
        group_id,
    )
    .execute(&state.db)
    .await
    .map_err(internal)?;
    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "challenge not found".into()));
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn require_member(
    db: &PgPool,
    group_id: Uuid,
    athlete_id: i64,
) -> Result<(), (StatusCode, String)> {
    let is_member = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1 AND athlete_id = $2)",
        group_id,
        athlete_id
    )
    .fetch_one(db)
    .await
    .map_err(internal)?
    .unwrap_or(false);

    if !is_member {
        return Err((StatusCode::FORBIDDEN, "not a member of this group".into()));
    }
    Ok(())
}

fn internal(e: impl std::fmt::Display) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
