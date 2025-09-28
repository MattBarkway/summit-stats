use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::signal;
use tokio::task::AbortHandle;
use tower_sessions::cookie::time::Duration;
use tower_sessions::session_store::ExpiredDeletion;
use tower_sessions::{Expiry, SessionManagerLayer};

use tower_sessions_sqlx_store::PostgresStore;
pub mod models;
pub mod routes;
pub mod utilities;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let client_id = std::env::var("CLIENT_ID")
        .expect("CLIENT_ID must be set")
        .trim()
        .to_string();
    let client_secret = std::env::var("CLIENT_SECRET")
        .expect("CLIENT_SECRET must be set")
        .trim()
        .to_string();
    let redirect_uri = std::env::var("REDIRECT_URI")
        .expect("REDIRECT_URI must be set")
        .trim()
        .to_string();
    let db_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set")
        .trim()
        .to_string();

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Could not connect to database");

    let session_store = PostgresStore::new(pool.clone());
    session_store
        .migrate()
        .await
        .expect("Could not migrate the database for sessions");

    let deletion_task = tokio::task::spawn(
        session_store
            .clone()
            .continuously_delete_expired(tokio::time::Duration::from_secs(60)),
    );
    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false) // set true once deployed
        .with_expiry(Expiry::OnInactivity(Duration::minutes(30)));

    let state = Arc::new(AppState {
        db: pool,
        client_id,
        client_secret,
        redirect_uri,
    });

    let app = routes::routes().with_state(state).layer(session_layer);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(deletion_task.abort_handle()))
        .await
        .unwrap();
}

async fn shutdown_signal(deletion_task_abort_handle: AbortHandle) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { deletion_task_abort_handle.abort() },
        _ = terminate => { deletion_task_abort_handle.abort() },
    }
}
