use serde::Serialize;
use time::OffsetDateTime;

#[derive(Serialize)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub athlete_id: i64,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub profile_url: Option<String>,
    pub points: i64,
    pub activity_count: i64,
}

#[derive(Serialize)]
pub struct LeaderboardResponse {
    pub cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
    pub entries: Vec<LeaderboardEntry>,
}
