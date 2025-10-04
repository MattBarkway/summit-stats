use crate::AppState;
use crate::extractors::strava::StravaClient;
use axum::{Json, Router, routing::get};
use std::sync::Arc;
use axum::extract::Query;
use serde::{Deserialize, Serialize};
use strava_wrapper::models::{Activity, ActivityStats, DetailedAthlete};
use strava_wrapper::query::{Page, PerPage, Sendable, ID};

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/activities", get(my_activities)).route("/athlete", get(athlete_summary))
}


#[derive(Deserialize)]
struct ActivitiesQuery {
    page: Option<usize>,
    per_page: Option<usize>,
}

async fn my_activities(
    Query(params): Query<ActivitiesQuery>,
    StravaClient { client }: StravaClient,
) -> Result<Json<Vec<Activity>>, String> {
    let page = params.page.unwrap_or(1);
    let per_page = params.per_page.unwrap_or(10);

    let activities = client
        .api()
        .athlete()
        .activities()
        .page(page.try_into().map_err(|e| format!("{:?}", e))?)
        .per_page(per_page.try_into().map_err(|e| format!("{:?}", e))?)
        .send()
        .await
        .map_err(|e| format!("{:?}", e))?;
    Ok(Json(activities))
}


#[derive(Serialize)]
struct AthleteWithStats {
    #[serde(flatten)]
    athlete: DetailedAthlete,
    stats: Option<ActivityStats>,
}

async fn athlete_summary(
    StravaClient { client }: StravaClient,
) -> Result<Json<AthleteWithStats>, String> {
    let athlete = client
        .api()
        .athlete()
        .get()
        .send()
        .await
        .map_err(|e| format!("Failed to get athlete: {:?}", e))?;
    let stats = if let Some(id) = athlete.id {
        Some(
            client
                .api()
                .athletes()
                .stats()
                .id(id as u64)
                .send()
                .await
                .map_err(|e| format!("Failed to get stats: {:?}", e))?,
        )
    } else {
        None
    };

    Ok(Json(AthleteWithStats { athlete, stats }))
}