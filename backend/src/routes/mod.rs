pub mod analyse;
pub mod auth;

use crate::AppState;
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .nest("/stats", analyse::routes())
        .nest("/auth", auth::routes())
}
