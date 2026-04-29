use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, sqlx::Type, Debug, Clone, Copy, PartialEq, Eq)]
#[sqlx(type_name = "cycle_type", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum CycleType {
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
    AllTime,
}

/// Cycle bounds resolved from a group's `cycle_type` via the
/// `cycle_bounds(cycle_type)` PG function.
pub struct CycleBounds {
    pub cycle_type: CycleType,
    pub start_at: OffsetDateTime,
    pub end_at: OffsetDateTime,
}

/// Optional historic-cycle override on `GET /groups/:id/leaderboard`.
#[derive(Deserialize)]
pub struct LeaderboardQuery {
    #[serde(default, with = "time::serde::rfc3339::option")]
    pub cycle_start: Option<OffsetDateTime>,
    #[serde(default, with = "time::serde::rfc3339::option")]
    pub cycle_end: Option<OffsetDateTime>,
}

/// Mixin shape — embedded in every response that exposes a cycle window.
#[derive(Serialize)]
pub struct CycleInfo {
    pub cycle_type: CycleType,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_start: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub cycle_end: OffsetDateTime,
}
