use crate::AppState;
use crate::extractors::strava::StravaClient;
use axum::routing::get;
use axum::{Json, Router};
use std::sync::Arc;
use strava_wrapper::models::DetailedAthlete;
use strava_wrapper::query::{ID, Sendable};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(me))
}

async fn me(StravaClient { client }: StravaClient) -> Result<Json<DetailedAthlete>, String> {
    let athlete = client
        .api()
        .athlete()
        .get()
        .send()
        .await
        .map_err(|e| format!("Failed to get athlete: {:?}", e))?;
    Ok(Json(athlete))
}
