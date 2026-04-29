//! `/groups` route tree. Sub-modules each expose a `routes()` returning a
//! sub-router; this top-level `routes()` aggregates them all.

mod challenges;
mod invite;
mod leaderboard;
mod rules;

use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::current_user::CurrentUser;
use crate::extractors::membership::{GroupMember, GroupOwner};
use crate::models::api::cycle::CycleType;
use crate::models::api::group::{
    CreateGroupRequest, GroupDetail, GroupSummary, MemberSummary, UpdateGroupRequest,
};
use crate::repository::groups::get_group_owner;
use crate::services::badges;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::PgPool;
use std::sync::Arc;
use uuid::Uuid;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_group).get(list_groups))
        .route(
            "/{id}",
            get(get_group).delete(delete_group).patch(update_group),
        )
        .route("/{id}/leave", post(leave_group))
        .merge(invite::routes())
        .merge(leaderboard::routes())
        .merge(rules::routes())
        .merge(challenges::routes())
}

/// Shared helper — used by create/update/join handlers to return the canonical
/// group payload after a mutation.
pub(super) async fn fetch_group_detail(db: &PgPool, id: Uuid) -> AppResult<Json<GroupDetail>> {
    let g = sqlx::query!(
        r#"
        SELECT
            g.id,
            g.name,
            g.description,
            g.icon_url,
            g.invite_code,
            g.owner_id,
            g.cycle_type       AS "cycle_type!: CycleType",
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

async fn seed_default_rules(tx: &mut sqlx::PgConnection, group_id: Uuid) -> AppResult<()> {
    use crate::models::api::rule::TriggerType;
    let rules: &[(TriggerType, f64, i32, Option<&str>)] = &[
        (TriggerType::DistanceKm, 50.0, 100, Some("Ride")),
        (TriggerType::DistanceKm, 100.0, 250, Some("Ride")),
        (TriggerType::DistanceKm, 10.0, 50, Some("Run")),
        (TriggerType::DistanceKm, 21.1, 150, Some("Run")),
        (TriggerType::ElevationM, 500.0, 50, None),
        (TriggerType::Kom, 1.0, 250, None),
        (TriggerType::TopTen, 1.0, 100, None),
    ];

    for (trigger, threshold, points, sport) in rules {
        sqlx::query!(
            r#"
            INSERT INTO point_rules (group_id, trigger_type, threshold, points, sport_type)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            group_id,
            *trigger as TriggerType,
            *threshold,
            *points,
            *sport,
        )
        .execute(&mut *tx)
        .await?;
    }
    Ok(())
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

    if let Err(e) =
        badges::award_group_badge(&state.db, athlete_id, group.id, "group_founder").await
    {
        tracing::warn!("group_founder badge award failed: {}", e);
    }

    fetch_group_detail(&state.db, group.id).await
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
            g.cycle_type       AS "cycle_type!: CycleType",
            cb.start_at        AS "cycle_start!",
            cb.end_at          AS "cycle_end!",
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS "member_count!",
            COALESCE((
                SELECT SUM(ep.points)::bigint
                FROM earned_points ep
                WHERE ep.group_id = g.id
                  AND ep.athlete_id = $1
                  AND COALESCE(ep.activity_start_date, ep.earned_at) >= cb.start_at
                  AND COALESCE(ep.activity_start_date, ep.earned_at) <  cb.end_at
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

async fn leave_group(
    State(state): State<Arc<AppState>>,
    GroupMember {
        group_id,
        athlete_id,
    }: GroupMember,
) -> AppResult<StatusCode> {
    let owner = get_group_owner(&state.db, group_id).await?;
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
