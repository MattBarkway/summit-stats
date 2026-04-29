use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::current_user::CurrentUser;
use crate::extractors::membership::{GroupMember, GroupOwner};
use crate::extractors::strava::StravaClient;
use crate::models::api::badge::BadgeSummary;
use crate::models::api::challenge::{Challenge, ChallengeResultEntry, CreateChallengeRequest};
use crate::models::api::cycle::{CycleBounds, LeaderboardQuery};
use crate::models::api::feed::FeedEntry;
use crate::models::api::group::{
    CreateGroupRequest, GroupDetail, GroupPreview, GroupSummary, JoinGroupRequest, MemberDetail,
    MemberSummary, UpdateGroupRequest,
};
use crate::models::api::leaderboard::{LeaderboardEntry, LeaderboardResponse};
use crate::models::api::rule::{CreateRuleRequest, Rule, UpdateRuleRequest, VALID_TRIGGERS};
use crate::repository::groups::fetch_cycle_bounds;
use crate::services::{activity_sync, badges, segment_challenges};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
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
        .route(
            "/{id}/challenges",
            get(list_challenges).post(create_challenge),
        )
        .route(
            "/{id}/challenges/{cid}",
            axum::routing::delete(delete_challenge),
        )
        .route("/{id}/leaderboard", get(get_leaderboard))
        .route("/{id}/feed", get(get_feed))
        .route("/{id}/members/{athlete_id}", get(get_member))
}

async fn create_group(
    State(state): State<Arc<AppState>>,
    CurrentUser { athlete_id }: CurrentUser,
    Json(req): Json<CreateGroupRequest>,
) -> AppResult<Json<GroupDetail>> {
    if req.name.trim().is_empty() {
        return Err(AppError::BadRequest("name required".into()));
    }

    let mut tx = state.db.begin().await?;

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
    .await?;

    sqlx::query!(
        "INSERT INTO group_members (group_id, athlete_id) VALUES ($1, $2)",
        group.id,
        athlete_id,
    )
    .execute(&mut *tx)
    .await?;

    seed_default_rules(&mut *tx, group.id).await?;

    tx.commit().await?;

    if let Err(e) = badges::award_group_badge(&state.db, athlete_id, group.id, "group_founder")
        .await
    {
        tracing::warn!("group_founder badge award failed: {}", e);
    }

    fetch_group_detail(&state.db, group.id).await
}

async fn seed_default_rules(tx: &mut sqlx::PgConnection, group_id: Uuid) -> AppResult<()> {
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
        .await?;
    }
    Ok(())
}

async fn list_groups(
    State(state): State<Arc<AppState>>,
    CurrentUser { athlete_id }: CurrentUser,
) -> AppResult<Json<Vec<GroupSummary>>> {
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
    .await?;

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
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<GroupDetail>> {
    fetch_group_detail(&state.db, group_id).await
}

async fn fetch_group_detail(db: &PgPool, id: Uuid) -> AppResult<Json<GroupDetail>> {
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
    .await?
    .ok_or(AppError::NotFound("group not found"))?;

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
    .await?
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
    GroupOwner { group_id, .. }: GroupOwner,
    Json(req): Json<UpdateGroupRequest>,
) -> AppResult<Json<GroupDetail>> {
    let trimmed_name = req.name.as_ref().map(|s| s.trim().to_string());
    if let Some(n) = &trimmed_name {
        if n.is_empty() {
            return Err(AppError::BadRequest("name cannot be empty".into()));
        }
    }

    let icon_url = match req.icon_url.as_ref().map(|s| s.trim()) {
        Some("") => Some(None),
        Some(url) if url.starts_with("https://") => Some(Some(url.to_string())),
        Some(_) => {
            return Err(AppError::BadRequest(
                "icon_url must start with https://".into(),
            ));
        }
        None => None,
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
        group_id,
        trimmed_name,
        req.description.is_some(),
        req.description.as_deref(),
        icon_url.is_some(),
        icon_url.flatten(),
    )
    .execute(&state.db)
    .await?;

    fetch_group_detail(&state.db, group_id).await
}

async fn get_preview(
    State(state): State<Arc<AppState>>,
    Path(code): Path<String>,
) -> AppResult<Json<GroupPreview>> {
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
    .await?
    .ok_or(AppError::NotFound("invite code not found"))?;

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
) -> AppResult<Json<GroupDetail>> {
    let group = sqlx::query!(
        "SELECT id FROM groups WHERE invite_code = $1",
        req.invite_code.trim()
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("invite code not found"))?;

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
    .await?;

    fetch_group_detail(&state.db, group.id).await
}

async fn leave_group(
    State(state): State<Arc<AppState>>,
    GroupMember { group_id, athlete_id }: GroupMember,
) -> AppResult<StatusCode> {
    let owner = crate::repository::groups::get_group_owner(&state.db, group_id).await?;
    if owner == athlete_id {
        return Err(AppError::Forbidden(
            "owner must delete the group instead of leaving",
        ));
    }

    sqlx::query!(
        "DELETE FROM group_members WHERE group_id = $1 AND athlete_id = $2",
        group_id,
        athlete_id,
    )
    .execute(&state.db)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

async fn delete_group(
    State(state): State<Arc<AppState>>,
    GroupOwner { group_id, .. }: GroupOwner,
) -> AppResult<StatusCode> {
    sqlx::query!("DELETE FROM groups WHERE id = $1", group_id)
        .execute(&state.db)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn get_leaderboard(
    State(state): State<Arc<AppState>>,
    Query(q): Query<LeaderboardQuery>,
    StravaClient { client }: StravaClient,
    GroupMember { group_id, athlete_id }: GroupMember,
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
    // Caller's membership already proved by GroupMember extractor. Verify the
    // *target* athlete is also a member of this group.
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

async fn list_rules(
    State(state): State<Arc<AppState>>,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<Vec<Rule>>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        FROM point_rules
        WHERE group_id = $1
        ORDER BY trigger_type, threshold
        "#,
        group_id
    )
    .fetch_all(&state.db)
    .await?;

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
    GroupOwner { group_id, .. }: GroupOwner,
    Json(req): Json<CreateRuleRequest>,
) -> AppResult<Json<Rule>> {
    if !VALID_TRIGGERS.contains(&req.trigger_type.as_str()) {
        return Err(AppError::BadRequest("invalid trigger_type".into()));
    }
    if req.points < 0 {
        return Err(AppError::BadRequest("points must be >= 0".into()));
    }
    let sport = req
        .sport_type
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    let row = sqlx::query!(
        r#"
        INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
        VALUES ($1, $2::text::point_trigger, $3, $4, $5)
        RETURNING id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        "#,
        group_id,
        req.trigger_type,
        req.threshold,
        req.points,
        sport,
    )
    .fetch_one(&state.db)
    .await?;

    activity_sync::evaluate_for_group(&state.db, group_id).await?;

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
    Path((_, rule_id)): Path<(Uuid, Uuid)>,
    GroupOwner { group_id, .. }: GroupOwner,
    Json(req): Json<UpdateRuleRequest>,
) -> AppResult<Json<Rule>> {
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
    .await?
    .ok_or(AppError::NotFound("rule not found"))?;

    let new_threshold = req.threshold.unwrap_or(existing.threshold);
    let new_points = req.points.unwrap_or(existing.points);
    let threshold_changed =
        req.threshold.is_some() && req.threshold != Some(existing.threshold);

    let mut tx = state.db.begin().await?;

    sqlx::query!(
        "UPDATE point_rules SET threshold = $1, points = $2 WHERE id = $3",
        new_threshold,
        new_points,
        rule_id,
    )
    .execute(&mut *tx)
    .await?;

    if threshold_changed {
        sqlx::query!("DELETE FROM earned_points WHERE rule_id = $1", rule_id)
            .execute(&mut *tx)
            .await?;
    } else if req.points.is_some() {
        sqlx::query!(
            "UPDATE earned_points SET points = $1 WHERE rule_id = $2",
            new_points,
            rule_id,
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    if threshold_changed {
        activity_sync::evaluate_for_group(&state.db, group_id).await?;
    }

    let row = sqlx::query!(
        r#"
        SELECT id, trigger_type::text AS "trigger_type!", threshold, points, sport_type
        FROM point_rules WHERE id = $1
        "#,
        rule_id
    )
    .fetch_one(&state.db)
    .await?;

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
    Path((_, rule_id)): Path<(Uuid, Uuid)>,
    GroupOwner { group_id, .. }: GroupOwner,
) -> AppResult<StatusCode> {
    let result = sqlx::query!(
        "DELETE FROM point_rules WHERE id = $1 AND group_id = $2",
        rule_id,
        group_id,
    )
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("rule not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn list_challenges(
    State(state): State<Arc<AppState>>,
    StravaClient { client: _ }: StravaClient,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<Vec<Challenge>>> {
    if let Err(e) = segment_challenges::resolve_expired(&state.db, group_id).await {
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
        group_id
    )
    .fetch_all(&state.db)
    .await?;

    let mut challenges = Vec::with_capacity(rows.len());
    for c in rows {
        let entries = if c.resolved_at.is_some() {
            sqlx::query!(
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
            .await?
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
                group_id,
                c.segment_id,
                c.starts_at,
                c.ends_at,
            )
            .fetch_all(&state.db)
            .await?
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
    StravaClient { client }: StravaClient,
    GroupOwner { group_id, athlete_id }: GroupOwner,
    Json(req): Json<CreateChallengeRequest>,
) -> AppResult<Json<Challenge>> {
    if req.ends_at <= OffsetDateTime::now_utc() {
        return Err(AppError::BadRequest("ends_at must be in the future".into()));
    }

    use strava_wrapper::prelude::*;
    let segment = client
        .api()
        .segments()
        .get()
        .id(req.segment_id as u64)
        .send()
        .await
        .map_err(|e| AppError::Strava(format!("segment fetch: {:?}", e)))?;

    let segment_name = segment
        .name
        .clone()
        .ok_or_else(|| AppError::Strava("segment missing name".into()))?;

    let row = sqlx::query!(
        r#"
        INSERT INTO segment_challenges
          (group_id, segment_id, segment_name, ends_at,
           points_winner, points_top3, points_finish, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, segment_id, segment_name, starts_at, ends_at,
                  points_winner, points_top3, points_finish, resolved_at
        "#,
        group_id,
        req.segment_id,
        segment_name,
        req.ends_at,
        req.points_winner.unwrap_or(500),
        req.points_top3.unwrap_or(200),
        req.points_finish.unwrap_or(50),
        athlete_id,
    )
    .fetch_one(&state.db)
    .await?;

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
    Path((_, cid)): Path<(Uuid, Uuid)>,
    GroupOwner { group_id, .. }: GroupOwner,
) -> AppResult<StatusCode> {
    let result = sqlx::query!(
        "DELETE FROM segment_challenges WHERE id = $1 AND group_id = $2",
        cid,
        group_id,
    )
    .execute(&state.db)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("challenge not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}
