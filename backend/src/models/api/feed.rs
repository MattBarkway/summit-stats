use crate::models::api::rule::TriggerType;
use serde::Serialize;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Serialize)]
pub struct FeedEntry {
    pub id: Uuid,
    #[serde(with = "time::serde::rfc3339")]
    pub earned_at: OffsetDateTime,
    pub points: i32,
    pub athlete_id: i64,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub profile_url: Option<String>,
    pub activity_id: Option<i64>,
    pub activity_name: Option<String>,
    pub activity_sport_type: Option<String>,
    pub activity_distance_m: Option<f64>,
    pub activity_moving_time_s: Option<i32>,
    pub activity_elevation_m: Option<f64>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub activity_start_date: Option<OffsetDateTime>,
    pub trigger_type: TriggerType,
    pub threshold: f64,
    pub rule_sport_type: Option<String>,
}
