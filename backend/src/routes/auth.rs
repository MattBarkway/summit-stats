use crate::AppState;
use crate::models::api::auth::TokenResponse;
use axum::extract::State;
use axum::{
    Json, Router,
    extract::Query,
    response::{Html, Redirect},
    routing::get,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tower_sessions::Session;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/strava", get(start_oauth))
        .route("/strava/callback", get(callback))
}

async fn start_oauth(State(state): State<Arc<AppState>>) -> Redirect {
    let url = format!(
        "https://www.strava.com/oauth/authorize?client_id={}&response_type=code&redirect_uri={}&approval_prompt=force&scope=read",
        state.client_id, state.redirect_uri
    );
    Redirect::to(&url)
}

#[derive(Deserialize)]
struct CallbackQuery {
    code: String,
    scope: Option<String>,
}

async fn callback(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CallbackQuery>,
    mut session: Session,
) -> Result<Redirect, String> {
    let client = Client::new();

    let mut form = HashMap::new();
    form.insert("client_id", state.client_id.clone());
    form.insert("client_secret", state.client_secret.clone());
    form.insert("grant_type", "authorization_code".into());
    form.insert("code", params.code);

    let res = client
        .post("https://www.strava.com/oauth/token")
        .form(&form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Failed to get token: {:?}", res.text().await));
    }

    let token: TokenResponse = res.json().await.map_err(|e| e.to_string())?;

    sqlx::query!(
        r#"
        INSERT INTO tokens (athlete_id, access_token, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (athlete_id) DO UPDATE
          SET access_token = EXCLUDED.access_token,
              refresh_token = EXCLUDED.refresh_token,
              expires_at = EXCLUDED.expires_at
        "#,
        token.athlete.id,
        token.access_token,
        token.refresh_token,
        token.expires_at,
    )
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    session
        .insert("athlete_id", token.athlete.id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Redirect::to("/dashboard"))
}
