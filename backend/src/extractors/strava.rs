use crate::AppState;
use crate::extractors::current_user::CurrentUser;
use crate::utilities::strava::UserStravaClient;
use axum::extract::FromRef;
use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
};
use std::sync::Arc;

pub struct StravaClient {
    pub client: UserStravaClient,
}

impl<S> FromRequestParts<S> for StravaClient
where
    Arc<AppState>: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = Arc::<AppState>::from_ref(state);

        let CurrentUser { athlete_id } = CurrentUser::from_request_parts(parts, &state)
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "not authenticated"))?;

        let mut client = UserStravaClient::new(state.db.clone(), athlete_id, &state.strava_url)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "client init failed"))?;

        client
            .ensure_token(&state.client_id, &state.client_secret)
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "token refresh failed"))?;

        Ok(StravaClient { client })
    }
}
