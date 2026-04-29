//! Segment challenge CRUD + ranked listing.

use crate::AppState;
use crate::errors::{AppError, AppResult};
use crate::extractors::membership::{GroupMember, GroupOwner};
use crate::extractors::strava::StravaClient;
use crate::models::api::challenge::{Challenge, ChallengeResultEntry, CreateChallengeRequest};
use crate::services::segment_challenges;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{delete, get};
use axum::{Json, Router};
use std::collections::HashMap;
use std::sync::Arc;
use time::OffsetDateTime;
use uuid::Uuid;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route(
            "/{id}/challenges",
            get(list_challenges).post(create_challenge),
        )
        .route("/{id}/challenges/{cid}", delete(delete_challenge))
}

async fn list_challenges(
    State(state): State<Arc<AppState>>,
    StravaClient { client: _ }: StravaClient,
    GroupMember { group_id, .. }: GroupMember,
) -> AppResult<Json<Vec<Challenge>>> {
    if let Err(e) = segment_challenges::resolve_expired(&state.db, group_id).await {
        tracing::warn!("challenge resolution failed: {}", e);
    }

    let challenge_rows = sqlx::query!(
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

    let mut resolved_results: HashMap<Uuid, Vec<ChallengeResultEntry>> = HashMap::new();
    let result_rows = sqlx::query!(
        r#"
        SELECT
            r.challenge_id,
            r.athlete_id,
            u.firstname,
            u.lastname,
            u.profile_url,
            r.best_time_s,
            r.rank
        FROM segment_challenge_results r
        JOIN segment_challenges c ON c.id = r.challenge_id
        JOIN users u ON u.athlete_id = r.athlete_id
        WHERE c.group_id = $1
        ORDER BY r.challenge_id, r.rank
        "#,
        group_id
    )
    .fetch_all(&state.db)
    .await?;
    for r in result_rows {
        resolved_results
            .entry(r.challenge_id)
            .or_default()
            .push(ChallengeResultEntry {
                athlete_id: r.athlete_id,
                firstname: r.firstname,
                lastname: r.lastname,
                profile_url: r.profile_url,
                best_time_s: Some(r.best_time_s),
                rank: Some(r.rank),
            });
    }

    let mut challenges = Vec::with_capacity(challenge_rows.len());
    for c in challenge_rows {
        let entries = if c.resolved_at.is_some() {
            resolved_results.remove(&c.id).unwrap_or_default()
        } else {
            sqlx::query!(
                r#"
                SELECT
                    scp.athlete_id,
                    u.firstname,
                    u.lastname,
                    u.profile_url,
                    scp.best_time_s AS "best!"
                FROM segment_challenge_progress scp
                JOIN group_members gm
                  ON gm.athlete_id = scp.athlete_id AND gm.group_id = $1
                JOIN users u ON u.athlete_id = scp.athlete_id
                WHERE scp.challenge_id = $2
                ORDER BY scp.best_time_s ASC
                "#,
                group_id,
                c.id,
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
    GroupOwner {
        group_id,
        athlete_id,
    }: GroupOwner,
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
