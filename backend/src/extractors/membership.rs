use crate::AppState;
use crate::errors::AppError;
use crate::extractors::current_user::CurrentUser;
use axum::extract::{FromRef, FromRequestParts, Path};
use axum::http::request::Parts;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

/// Caller is a member of the group identified by the `:id` path segment.
/// Rejects with 401 if unauthenticated, 404 if group missing, 403 if not a
/// member.
pub struct GroupMember {
    pub group_id: Uuid,
    pub athlete_id: i64,
}

/// Caller is the owner of the group identified by the `:id` path segment.
/// Rejects with 401 if unauthenticated, 404 if group missing, 403 if not the
/// owner.
pub struct GroupOwner {
    pub group_id: Uuid,
    pub athlete_id: i64,
}

/// Pull `:id` from path params without consuming them — works whether the
/// route is `/:id`, `/:id/members/:athlete_id`, or any nesting.
async fn extract_group_id<S>(parts: &mut Parts, state: &S) -> Result<Uuid, AppError>
where
    S: Send + Sync,
{
    let Path(params): Path<HashMap<String, String>> =
        Path::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::BadRequest("path params missing".into()))?;
    let id_str = params
        .get("id")
        .ok_or_else(|| AppError::BadRequest("group id missing".into()))?;
    Uuid::parse_str(id_str).map_err(|_| AppError::BadRequest("invalid group id".into()))
}

impl<S> FromRequestParts<S> for GroupMember
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::<AppState>::from_ref(state);

        let CurrentUser { athlete_id } = CurrentUser::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized("not authenticated"))?;

        let group_id = extract_group_id(parts, state).await?;

        let exists =
            sqlx::query_scalar!("SELECT EXISTS(SELECT 1 FROM groups WHERE id = $1)", group_id)
                .fetch_one(&app_state.db)
                .await?
                .unwrap_or(false);
        if !exists {
            return Err(AppError::NotFound("group not found"));
        }

        let is_member = sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1 AND athlete_id = $2)",
            group_id,
            athlete_id
        )
        .fetch_one(&app_state.db)
        .await?
        .unwrap_or(false);

        if !is_member {
            return Err(AppError::Forbidden("not a member of this group"));
        }

        Ok(GroupMember {
            group_id,
            athlete_id,
        })
    }
}

impl<S> FromRequestParts<S> for GroupOwner
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::<AppState>::from_ref(state);

        let CurrentUser { athlete_id } = CurrentUser::from_request_parts(parts, state)
            .await
            .map_err(|_| AppError::Unauthorized("not authenticated"))?;

        let group_id = extract_group_id(parts, state).await?;

        let owner = sqlx::query_scalar!("SELECT owner_id FROM groups WHERE id = $1", group_id)
            .fetch_optional(&app_state.db)
            .await?
            .ok_or(AppError::NotFound("group not found"))?;

        if owner != athlete_id {
            return Err(AppError::Forbidden("owner only"));
        }

        Ok(GroupOwner {
            group_id,
            athlete_id,
        })
    }
}
