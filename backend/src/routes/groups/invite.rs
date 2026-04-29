//! Public invite preview + authenticated join-by-code.

use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::current_user::CurrentUser;
use crate::models::api::cycle::CycleType;
use crate::models::api::group::{GroupDetail, GroupPreview, JoinGroupRequest};
use crate::routes::groups::fetch_group_detail;
use axum::extract::{Path, State};
use axum::routing::{get, post};
use axum::{Json, Router};
use std::sync::Arc;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/preview/{code}", get(get_preview))
        .route("/join", post(join_group))
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
            g.cycle_type       AS "cycle_type!: CycleType",
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
