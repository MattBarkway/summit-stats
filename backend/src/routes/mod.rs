pub mod analyse;
pub mod auth;

use crate::AppState;
use axum::Router;
use std::sync::Arc;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .nest("/stats", analyse::routes())
        .nest("/auth", auth::routes())
}
