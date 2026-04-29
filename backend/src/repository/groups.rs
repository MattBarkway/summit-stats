use crate::errors::{AppError, AppResult};
use crate::models::api::cycle::CycleBounds;
use sqlx::PgPool;
use uuid::Uuid;

/// Look up the owner of a group. Returns NotFound if the group doesn't exist.
pub async fn get_group_owner(db: &PgPool, group_id: Uuid) -> AppResult<i64> {
    sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", group_id)
        .fetch_optional(db)
        .await?
        .ok_or(AppError::NotFound("group not found"))
}

/// Resolve cycle bounds for a group via the `cycle_bounds(cycle_type)` PG
/// helper function. Returns NotFound if the group doesn't exist.
pub async fn fetch_cycle_bounds(db: &PgPool, group_id: Uuid) -> AppResult<CycleBounds> {
    let row = sqlx::query!(
        r#"
        SELECT
            g.cycle_type::text AS "cycle_type!",
            cb.start_at        AS "start_at!",
            cb.end_at          AS "end_at!"
        FROM groups g
        CROSS JOIN LATERAL cycle_bounds(g.cycle_type) cb
        WHERE g.id = $1
        "#,
        group_id
    )
    .fetch_optional(db)
    .await?
    .ok_or(AppError::NotFound("group not found"))?;

    Ok(CycleBounds {
        cycle_type: row.cycle_type,
        start_at: row.start_at,
        end_at: row.end_at,
    })
}
