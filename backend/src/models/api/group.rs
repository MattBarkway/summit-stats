use crate::models::api::badge::BadgeSummary;
use crate::models::api::feed::FeedEntry;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct JoinGroupRequest {
    pub invite_code: String,
}

#[derive(Deserialize)]
pub struct UpdateGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon_url: Option<String>,
}

#[derive(Serialize)]
pub struct MemberSummary {
    pub athlete_id: i64,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub profile_url: Option<String>,
}

#[derive(Serialize)]
pub struct GroupSummary {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub member_count: i64,
    pub my_points: i64,
    pub cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
pub struct GroupDetail {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub icon_url: Option<String>,
    pub invite_code: String,
    pub owner_id: i64,
    pub members: Vec<MemberSummary>,
    pub cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
pub struct GroupPreview {
    pub name: String,
    pub icon_url: Option<String>,
    pub member_count: i64,
    pub owner_name: String,
    pub cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
}

#[derive(Serialize)]
pub struct MemberDetail {
    pub athlete_id: i64,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
    pub profile_url: Option<String>,
    pub rank: i64,
    pub points: i64,
    pub activity_count: i64,
    pub total_distance_m: f64,
    pub total_elevation_m: f64,
    pub cycle_type: String,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
    pub events: Vec<FeedEntry>,
    pub badges: Vec<BadgeSummary>,
}
