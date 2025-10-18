use http::Method;
use http::header::CONTENT_TYPE;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::signal;
use tokio::task::AbortHandle;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_sessions::cookie::time::Duration;
use tower_sessions::session_store::ExpiredDeletion;
use tower_sessions::{Expiry, SessionManagerLayer};

use tower_sessions_sqlx_store::PostgresStore;
use tracing_subscriber::fmt::writer::MakeWriterExt;

pub mod extractors;
pub mod models;
pub mod routes;
pub mod utilities;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub strava_url: String,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[tokio::main]
async fn main() {
    println!("Starting main() — env check");
    tracing_subscriber::fmt().with_writer(std::io::stdout.with_max_level(tracing::Level::INFO))
        .init();;
    tracing::info!("Starting strava_analyser...");
    for (key, value) in std::env::vars() {
        println!("{}={}", key, value);
    }
    dotenv::dotenv().ok();

    let client_id = std::env::var("CLIENT_ID")
        .expect("CLIENT_ID must be set")
        .trim()
        .to_string();
    tracing::info!("Got CLIENT_ID...");
    let client_secret = std::env::var("CLIENT_SECRET")
        .expect("CLIENT_SECRET must be set")
        .trim()
        .to_string();
    tracing::info!("Got CLIENT_SECRET...");
    let redirect_uri = std::env::var("REDIRECT_URI")
        .expect("REDIRECT_URI must be set")
        .trim()
        .to_string();
    tracing::info!("Got REDIRECT_URI...");
    let strava_url = std::env::var("STRAVA_URL")
        .expect("STRAVA_URL must be set")
        .trim()
        .to_string();
    tracing::info!("Got STRAVA_URL...");
    let db_url = format!(
        "postgres://{}:{}@{}:5432/{}",
        std::env::var("DATABASE_USER")
            .expect("DATABASE_USER must be set")
            .trim(),
        std::env::var("DATABASE_PASSWORD")
            .expect("DATABASE_PASSWORD must be set")
            .trim(),
        std::env::var("DATABASE_HOST")
            .expect("DATABASE_HOST must be set")
            .trim(),
        std::env::var("DATABASE_NAME")
            .expect("DATABASE_NAME must be set")
            .trim()
    );
    tracing::info!("Got DATABASE_URL...");

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact("http://localhost:3000".parse().unwrap()))
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([CONTENT_TYPE])
        .allow_credentials(true);

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
        .with_expiry(Expiry::OnInactivity(Duration::hours(1)));

    let state = Arc::new(AppState {
        db: pool,
        client_id,
        client_secret,
        redirect_uri,
        strava_url,
    });

    let app = routes::routes()
        .with_state(state)
        .layer(session_layer)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Starting server on {}", &addr);
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
