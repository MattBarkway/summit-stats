use crate::AppState;
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

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/strava", get(start_oauth))
        .route("/strava/callback", get(callback))
}

async fn start_oauth(State(state): State<AppState>) -> Redirect {
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

#[derive(Serialize, Deserialize, Debug)]
struct TokenResponse {
    token_type: String,
    expires_at: u64,
    expires_in: u64,
    refresh_token: String,
    access_token: String,
    athlete: serde_json::Value,
}

async fn callback(
    State(state): State<AppState>,
    Query(params): Query<CallbackQuery>,
) -> Result<Json<TokenResponse>, String> {
    let client = Client::new();

    let mut form = HashMap::new();
    form.insert("client_id", state.client_id);
    form.insert("client_secret", state.client_secret);
    form.insert("code", params.code);
    form.insert("grant_type", "authorization_code".into());

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
    Ok(Json(token))
}
