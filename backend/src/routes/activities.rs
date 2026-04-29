use crate::AppState;
use crate::extractors::strava::StravaClient;
use axum::extract::Path;
use axum::http::StatusCode;
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use std::sync::Arc;
use strava_wrapper::filters::streams::StreamKey;
use strava_wrapper::models::{Activity, StreamSet};
use strava_wrapper::prelude::*;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/{id}", get(get_activity))
}

#[derive(Serialize)]
struct ActivityDetail {
    activity: Activity,
    streams: StreamSet,
}

async fn get_activity(
    Path(id): Path<i64>,
    StravaClient { client }: StravaClient,
) -> Result<Json<ActivityDetail>, (StatusCode, String)> {
    let activity = client
        .api()
        .activities()
        .get()
        .id(id as u64)
        .include_all_efforts(true)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("activity fetch: {:?}", e)))?;

    let streams = client
        .api()
        .streams()
        .activity()
        .id(id as u64)
        .keys(&[StreamKey::Latlng, StreamKey::Altitude, StreamKey::Time])
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("stream fetch: {:?}", e)))?;

    Ok(Json(ActivityDetail { activity, streams }))
}
