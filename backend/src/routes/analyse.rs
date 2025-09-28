use crate::AppState;
use axum::{Json, Router, routing::get};
use std::sync::Arc;
use strava_wrapper::models::Activity;
use strava_wrapper::query::Sendable;
use crate::extractors::strava::StravaClient;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/activities", get(my_activities))
}

async fn my_activities(
    StravaClient {client}: StravaClient,
) -> Result<Json<Vec<Activity>>, String> {
    let activities = client
        .api()
        .athlete()
        .activities()
        .send()
        .await
        .map_err(|e| format!("{:?}", e))?;
    Ok(Json(activities))
}
