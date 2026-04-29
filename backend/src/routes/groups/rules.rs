//! Owner-editable point-rule CRUD.

use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::membership::{GroupMember, GroupOwner};
use crate::models::api::rule::{CreateRuleRequest, Rule, TriggerType, UpdateRuleRequest};
use crate::services::activity_sync;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, patch};
use axum::{Json, Router};
use std::sync::Arc;
use uuid::Uuid;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/{id}/rules", get(list_rules).post(create_rule))
        .route(
            "/{id}/rules/{rule_id}",
            patch(update_rule).delete(delete_rule),
        )
}

async fn list_rules(
    State(state): State<Arc<AppState>>,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<Vec<Rule>>> {
    let rows = sqlx::query!(
        r#"
        SELECT id, trigger_type AS "trigger_type!: TriggerType", threshold, points, sport_type
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
    if matches!(req.trigger_type, TriggerType::SegmentChallenge) {
        return Err(AppError::BadRequest(
            "segment_challenge is system-managed".into(),
        ));
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
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, trigger_type AS "trigger_type!: TriggerType", threshold, points, sport_type
        "#,
        group_id,
        req.trigger_type as TriggerType,
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
        SELECT trigger_type AS "trigger_type!: TriggerType", threshold, points
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
        SELECT id, trigger_type AS "trigger_type!: TriggerType", threshold, points, sport_type
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
