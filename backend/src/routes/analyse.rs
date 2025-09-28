use crate::AppState;
use crate::utilities::strava::UserStravaClient;
use axum::extract::State;
use axum::{Json, Router, routing::get};
use std::sync::Arc;
use strava_wrapper::models::Activity;
use strava_wrapper::query::Sendable;
use tower_sessions::Session;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/activities", get(my_activities))
}

async fn my_activities(
    State(state): State<Arc<AppState>>,
    session: Session,
) -> Result<Json<Activity>, String> {
    let athlete_id: i64 = session
        .get("athlete_id")
        .await
        .unwrap()
        .ok_or("Not authenticated")?;

    let mut client = UserStravaClient::new(state.db.clone(), athlete_id).await?;
    client
        .ensure_token(&state.client_id, &state.client_secret)
        .await?;

    let activities = client
        .api()
        .activities()
        .list()
        .send()
        .await
        .map_err(|e| "e".to_string())?;
    Ok(Json(activities))
}
