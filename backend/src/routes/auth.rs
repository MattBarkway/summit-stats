use crate::AppState;
use crate::extractors::current_user::CurrentUser;
use axum::extract::State;
use axum::{
    Json, Router,
    extract::Query,
    response::Redirect,
    routing::{get, post},
};
use serde::Deserialize;
use std::sync::Arc;
use strava_wrapper::api::StravaAPI;
use strava_wrapper::auth;
use strava_wrapper::query::Sendable;
use tower_sessions::Session;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/strava", get(start_oauth))
        .route("/strava/callback", get(callback))
        .route("/strava/deauth", post(deauth))
}

#[derive(Deserialize)]
struct StartOAuthQuery {
    next: Option<String>,
}

async fn start_oauth(
    State(state): State<Arc<AppState>>,
    Query(params): Query<StartOAuthQuery>,
    session: Session,
) -> Result<Redirect, String> {
    tracing::info!("Starting OAUTH");

    // Stash post-auth destination if it's a safe relative path.
    if let Some(next) = params.next.as_deref() {
        if next.starts_with('/') && !next.starts_with("//") {
            session
                .insert("post_auth_next", next)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    let url = format!(
        "{}/oauth/authorize?client_id={}&response_type=code&redirect_uri={}/auth/strava/callback&approval_prompt=force&scope=read_all,activity:read_all",
        state.strava_url, state.client_id, state.backend_url
    );
    Ok(Redirect::to(&url))
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: String,
    #[allow(dead_code)]
    scope: Option<String>,
}

async fn callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CallbackQuery>,
    session: Session,
) -> Result<Redirect, String> {
    tracing::info!("Received OAUTH callback");

    let token = auth::get_token_at(
        &format!("{}/oauth/token", &state.strava_url),
        state.client_id,
        &state.client_secret,
        &params.code,
    )
    .await
    .map_err(|e| format!("get_token failed: {:?}", e))?;

    let api = StravaAPI::new(
        &format!("{}/api", &state.strava_url),
        token.access_token.clone(),
    );
    let athlete = api
        .athlete()
        .get()
        .send()
        .await
        .map_err(|e| format!("athlete fetch failed: {:?}", e))?;

    let athlete_id = athlete
        .id
        .ok_or_else(|| "athlete id missing from Strava response".to_string())?;
    let expires_at = token.expires_at as i64;

    tracing::info!("Upserting tokens for athlete {}", athlete_id);
    sqlx::query!(
        r#"
        INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (athlete_id) DO UPDATE
          SET access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token,
              expires_at = EXCLUDED.expires_at
        "#,
        athlete_id,
        token.access_token,
        token.refresh_token,
        expires_at,
    )
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    tracing::info!("Upserting user record");
    sqlx::query!(
        r#"
        INSERT INTO users (athlete_id, firstname, lastname, profile_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (athlete_id) DO UPDATE
          SET firstname = EXCLUDED.firstname,
              lastname = EXCLUDED.lastname,
              profile_url = EXCLUDED.profile_url
        "#,
        athlete_id,
        athlete.firstname,
        athlete.lastname,
        athlete.profile_medium,
    )
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    session
        .insert("athlete_id", athlete_id)
        .await
        .map_err(|e| e.to_string())?;

    let next: Option<String> = session
        .remove("post_auth_next")
        .await
        .map_err(|e| e.to_string())?;
    let dest = next
        .filter(|n| n.starts_with('/') && !n.starts_with("//"))
        .unwrap_or_else(|| "/groups".to_string());
    tracing::info!("Redirecting user to {}", dest);
    Ok(Redirect::to(&format!("{}{}", &state.frontend_url, dest)))
}

async fn deauth(
    State(state): State<Arc<AppState>>,
    session: Session,
    CurrentUser { athlete_id }: CurrentUser,
) -> Result<Json<serde_json::Value>, String> {
    let row = sqlx::query!(
        "SELECT access_token FROM tokens WHERE athlete_id = $1",
        athlete_id
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if let Err(e) = auth::deauthorize(&row.access_token).await {
        tracing::warn!("Strava deauthorize failed (continuing): {:?}", e);
    }

    session.delete().await.map_err(|e| e.to_string())?;
    Ok(Json(serde_json::json!({ "ok": true })))
}
