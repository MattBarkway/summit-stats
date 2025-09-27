use axum::{Router, routing::get, Json};
use serde::Serialize;
use crate::AppState;

#[derive(Serialize)]
struct Stats {
    id: u32,
    title: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/", get(get_stats))
}

async fn get_stats() -> Json<Vec<Stats>> {
    Json(vec![
        Stats { id: 1, title: "Hello World".into() },
        Stats { id: 2, title: "Axum is cool".into() },
    ])
}