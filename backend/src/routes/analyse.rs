use std::sync::Arc;
use crate::AppState;
use axum::{Json, Router, routing::get};
use serde::Serialize;

#[derive(Serialize)]
struct Stats {
    id: u32,
    title: String,
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/", get(get_stats))
}

async fn get_stats() -> Json<Vec<Stats>> {
    Json(vec![
        Stats {
            id: 1,
            title: "Hello World".into(),
        },
        Stats {
            id: 2,
            title: "Axum is cool".into(),
        },
    ])
}
