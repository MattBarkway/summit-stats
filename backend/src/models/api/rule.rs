use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub struct Rule {
    pub id: Uuid,
    pub trigger_type: String,
    pub threshold: f64,
    pub points: i32,
    pub sport_type: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateRuleRequest {
    pub trigger_type: String,
    pub threshold: f64,
    pub points: i32,
    pub sport_type: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateRuleRequest {
    pub threshold: Option<f64>,
    pub points: Option<i32>,
}

pub const VALID_TRIGGERS: &[&str] = &[
    "distance_km",
    "elevation_m",
    "kom",
    "top_ten",
    "achievement",
];
