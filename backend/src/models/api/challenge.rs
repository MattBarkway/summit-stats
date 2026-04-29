use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Serialize)]
pub struct ChallengeResultEntry {
    pub athlete_id: i64,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub profile_url: Option<String>,
    pub best_time_s: Option<i32>,
    pub rank: Option<i32>,
}

#[derive(Serialize)]
pub struct Challenge {
    pub id: Uuid,
    pub segment_id: i64,
    pub segment_name: String,
    #[serde(with = "time::serde::rfc3339")]
    pub starts_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub ends_at: OffsetDateTime,
    pub points_winner: i32,
    pub points_top3: i32,
    pub points_finish: i32,
    #[serde(with = "time::serde::rfc3339::option")]
    pub resolved_at: Option<OffsetDateTime>,
    pub results: Vec<ChallengeResultEntry>,
}

#[derive(Deserialize)]
pub struct CreateChallengeRequest {
    pub segment_id: i64,
    #[serde(with = "time::serde::rfc3339")]
    pub ends_at: OffsetDateTime,
    pub points_winner: Option<i32>,
    pub points_top3: Option<i32>,
    pub points_finish: Option<i32>,
}
