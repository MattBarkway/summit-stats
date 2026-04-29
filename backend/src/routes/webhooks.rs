//! Strava push subscription endpoint.
//!
//! - GET /webhooks/strava handles the subscription verification handshake.
//! - POST /webhooks/strava receives event notifications. We respond 200 fast
//!   (Strava retries on non-2xx) and do work async via `tokio::spawn`.
//!
//! Compliance: athlete deauthorisation events (`updates.authorized=false`)
//! delete the tokens row, which cascades to all user-derived data per the
//! migration in `20260504000000_cascade_user_deletion.sql`. Activity delete
//! events remove the activity row from our cache (cascades segment_efforts;
//! earned_points keeps its row with `activity_id` set NULL once Phase C
//! ships).

use crate::AppState;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use serde::Deserialize;
use std::sync::Arc;
use strava_wrapper::auth;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/strava", get(verify).post(receive))
}

#[derive(Deserialize)]
struct VerifyQuery {
    #[serde(rename = "hub.mode")]
    mode: String,
    #[serde(rename = "hub.challenge")]
    challenge: String,
    #[serde(rename = "hub.verify_token")]
    verify_token: String,
}

async fn verify(
    State(state): State<Arc<AppState>>,
    Query(q): Query<VerifyQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    if state.webhook_verify_token.is_empty() {
        tracing::warn!("webhook verify rejected: server has no verify_token configured");
        return Err(StatusCode::FORBIDDEN);
    }
    if q.mode != "subscribe" || q.verify_token != state.webhook_verify_token {
        tracing::warn!("webhook verify rejected: mode={}, token mismatch", q.mode);
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(Json(serde_json::json!({ "hub.challenge": q.challenge })))
}

#[derive(Deserialize, Debug)]
struct WebhookEvent {
    object_type: String,
    object_id: i64,
    aspect_type: String,
    owner_id: i64,
    #[serde(default)]
    updates: serde_json::Value,
}

async fn receive(
    State(state): State<Arc<AppState>>,
    Json(event): Json<WebhookEvent>,
) -> StatusCode {
    tracing::info!(
        "strava webhook: {} {} object={} owner={}",
        event.aspect_type,
        event.object_type,
        event.object_id,
        event.owner_id,
    );

    let db = state.db.clone();
    tokio::spawn(async move {
        if let Err(e) = handle_event(&db, &event).await {
            tracing::error!("webhook handler failed: {:?}", e);
        }
    });

    StatusCode::OK
}

async fn handle_event(
    db: &sqlx::PgPool,
    event: &WebhookEvent,
) -> Result<(), sqlx::Error> {
    match (event.object_type.as_str(), event.aspect_type.as_str()) {
        // Athlete deauthorised on Strava's side (Settings → Apps).
        // Delete tokens row → cascades to users → all derived data.
        ("athlete", "update") => {
            let revoked = event
                .updates
                .get("authorized")
                .and_then(|v| match v {
                    serde_json::Value::String(s) => Some(s == "false"),
                    serde_json::Value::Bool(b) => Some(!b),
                    _ => None,
                })
                .unwrap_or(false);
            if revoked {
                tracing::info!(
                    "athlete {} revoked access — purging local data",
                    event.owner_id
                );
                let access_token = sqlx::query_scalar!(
                    "SELECT access_token FROM tokens WHERE athlete_id = $1",
                    event.owner_id
                )
                .fetch_optional(db)
                .await?;
                if let Some(token) = access_token {
                    if let Err(e) = auth::deauthorize(&token).await {
                        tracing::warn!(
                            "best-effort strava-side deauth on webhook revoke failed: {:?}",
                            e
                        );
                    }
                }
                sqlx::query!("DELETE FROM tokens WHERE athlete_id = $1", event.owner_id)
                    .execute(db)
                    .await?;
            }
        }

        // Activity deleted on Strava → drop our cached copy.
        // segment_efforts cascade via FK. earned_points referencing this
        // activity will set activity_id NULL once Phase C migration lands;
        // until then the FK blocks deletion if points exist, so we delete
        // points first.
        ("activity", "delete") => {
            sqlx::query!(
                "DELETE FROM earned_points WHERE activity_id = $1",
                event.object_id
            )
            .execute(db)
            .await?;
            sqlx::query!("DELETE FROM activities WHERE id = $1", event.object_id)
                .execute(db)
                .await?;
        }

        // Activity create/update — no-op for now. Lazy sync picks up creates
        // on next leaderboard load. Updates to existing activities will be
        // re-fetched once we have a stale-flag column (Phase C work).
        _ => {}
    }
    Ok(())
}
