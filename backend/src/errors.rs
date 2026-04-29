use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(&'static str),

    #[error("forbidden: {0}")]
    Forbidden(&'static str),

    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("conflict: {0}")]
    Conflict(&'static str),

    #[error("unauthorized: {0}")]
    Unauthorized(&'static str),

    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error("strava: {0}")]
    Strava(String),

    #[error("internal: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (code, msg) = match &self {
            Self::NotFound(m) => (StatusCode::NOT_FOUND, (*m).to_string()),
            Self::Forbidden(m) => (StatusCode::FORBIDDEN, (*m).to_string()),
            Self::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone()),
            Self::Conflict(m) => (StatusCode::CONFLICT, (*m).to_string()),
            Self::Unauthorized(m) => (StatusCode::UNAUTHORIZED, (*m).to_string()),
            Self::Sqlx(e) => {
                tracing::error!("db error: {:?}", e);
                if let sqlx::Error::Database(db) = e {
                    if db.is_unique_violation() {
                        return (StatusCode::CONFLICT, "duplicate".to_string()).into_response();
                    }
                }
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".to_string())
            }
            Self::Strava(m) => {
                tracing::error!("strava error: {}", m);
                (StatusCode::BAD_GATEWAY, m.clone())
            }
            Self::Internal(m) => {
                tracing::error!("internal: {}", m);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error".to_string())
            }
        };
        (code, msg).into_response()
    }
}

/// Convenience for services returning string-error today; bridge until Phase 1
/// fully migrates them.
impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Internal(s)
    }
}

pub type AppResult<T> = Result<T, AppError>;
