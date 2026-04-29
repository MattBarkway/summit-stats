use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::Type, Debug, Clone, Copy, PartialEq, Eq)]
#[sqlx(type_name = "point_trigger", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    DistanceKm,
    ElevationM,
    Kom,
    TopTen,
    Achievement,
    SegmentChallenge,
}

#[derive(Serialize)]
pub struct Rule {
    pub id: Uuid,
    pub trigger_type: TriggerType,
    pub threshold: f64,
    pub points: i32,
    pub sport_type: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateRuleRequest {
    pub trigger_type: TriggerType,
    pub threshold: f64,
    pub points: i32,
    pub sport_type: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateRuleRequest {
    pub threshold: Option<f64>,
    pub points: Option<i32>,
}
