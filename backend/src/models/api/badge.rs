use serde::Serialize;
use time::OffsetDateTime;

#[derive(Serialize)]
pub struct BadgeSummary {
    pub slug: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    #[serde(with = "time::serde::rfc3339")]
    pub awarded_at: OffsetDateTime,
    pub context: Option<serde_json::Value>,
}
