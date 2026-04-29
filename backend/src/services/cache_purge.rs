//! Strava-API compliance: raw Strava data must not remain cached for more
//! than 7 days. Lazy-purge — called from frequently-hit endpoints; cheap on
//! the indexed `synced_at` / `start_date` columns.

use sqlx::PgPool;
use time::{Duration, OffsetDateTime};

/// Drop activities + segment_efforts older than 7 days. Idempotent; safe to
/// call on every leaderboard / feed request.
pub async fn purge_stale_strava_cache(db: &PgPool) -> Result<(), String> {
    let cutoff = OffsetDateTime::now_utc() - Duration::days(7);

    sqlx::query!("DELETE FROM activities WHERE synced_at < $1", cutoff)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query!("DELETE FROM segment_efforts WHERE start_date < $1", cutoff)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
