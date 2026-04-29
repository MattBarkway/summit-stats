pub mod activities;
pub mod auth;
pub mod groups;
mod me;

use crate::AppState;
use axum::Router;
use std::sync::Arc;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .nest("/activities", activities::routes())
        .nest("/auth", auth::routes())
        .nest("/groups", groups::routes())
        .nest("/me", me::routes())
}
