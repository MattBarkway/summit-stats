pub mod analyse;
pub mod auth;

use std::sync::Arc;
use crate::AppState;
use axum::Router;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .nest("/stats", analyse::routes())
        .nest("/auth", auth::routes())
}
