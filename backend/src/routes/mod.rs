pub mod analyse;
pub mod auth;

use axum::Router;
use crate::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/stats", analyse::routes())
        .nest("/auth", auth::routes())
}