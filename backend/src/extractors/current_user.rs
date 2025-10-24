use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use tower_sessions::Session;

pub struct CurrentUser {
    pub athlete_id: i64,
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
    Session: FromRequestParts<S>,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        tracing::info!("Received request!");
        let session = Session::from_request_parts(parts, state)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "failed to extract session",
                )
            })?;
        tracing::info!("Found session!");
        let athlete_id: i64 = session
            .get("athlete_id")
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, "whoops"))?
            .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized"))?;
        tracing::info!("Found athlete!");
        Ok(CurrentUser { athlete_id })
    }
}
