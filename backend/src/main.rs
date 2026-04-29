use axum::Error;
use http::Method;
use http::header::CONTENT_TYPE;
use reqwest::Url;
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tokio::signal;
use tokio::task::AbortHandle;
use tower_http::cors::{AllowOrigin, Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tower_sessions::cookie::SameSite;
use tower_sessions::cookie::time::Duration;
use tower_sessions::session_store::ExpiredDeletion;
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions_sqlx_store::PostgresStore;
use tracing_subscriber::fmt::writer::MakeWriterExt;

pub mod errors;
pub mod extractors;
pub mod models;
pub mod repository;
pub mod routes;
pub mod services;
pub mod utilities;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub strava_url: String,
    pub client_id: u32,
    pub client_secret: String,
    pub backend_url: String,
    pub frontend_url: String,
    pub webhook_verify_token: String,
}

#[tokio::main]
async fn main() {
    println!("Starting main() — env check");
    tracing_subscriber::fmt()
        .with_writer(std::io::stdout.with_max_level(tracing::Level::INFO))
        .init();
    tracing::info!("Starting strava_analyser...");
    for (key, value) in std::env::vars() {
        println!("{}={}", key, value);
    }
    dotenv::dotenv().ok();

    let client_id: u32 = std::env::var("CLIENT_ID")
        .expect("CLIENT_ID must be set")
        .trim()
        .parse()
        .expect("CLIENT_ID must be a valid u32");
    tracing::info!("Got CLIENT_ID...");
    let client_secret = std::env::var("CLIENT_SECRET")
        .expect("CLIENT_SECRET must be set")
        .trim()
        .to_string();
    tracing::info!("Got CLIENT_SECRET...");
    let backend_url = std::env::var("BACKEND_URL")
        .expect("BACKEND_URL must be set")
        .trim()
        .to_string();
    tracing::info!("Got BACKEND_URL...");
    let strava_url = std::env::var("STRAVA_URL")
        .expect("STRAVA_URL must be set")
        .trim()
        .to_string();
    tracing::info!("Got STRAVA_URL...");
    let frontend_url = std::env::var("FRONTEND_URL")
        .expect("FRONTEND_URL must be set")
        .trim()
        .to_string();
    tracing::info!("Got FRONTEND_URL...");
    let webhook_verify_token = std::env::var("STRAVA_WEBHOOK_VERIFY_TOKEN")
        .unwrap_or_else(|_| {
            tracing::warn!(
                "STRAVA_WEBHOOK_VERIFY_TOKEN not set — webhook endpoint will reject all subscriptions"
            );
            String::new()
        })
        .trim()
        .to_string();
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
        .allow_origin(AllowOrigin::exact(frontend_url.parse().unwrap()))
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PATCH,
            Method::DELETE,
            Method::OPTIONS,
        ])
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

    let cookie_secure = std::env::var("COOKIE_SECURE")
        .map(|v| v.trim().eq_ignore_ascii_case("true"))
        .unwrap_or(true);
    let cookie_same_site = match std::env::var("COOKIE_SAME_SITE")
        .unwrap_or_else(|_| "none".into())
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "lax" => SameSite::Lax,
        "strict" => SameSite::Strict,
        _ => SameSite::None,
    };
    let cookie_domain = std::env::var("COOKIE_DOMAIN")
        .ok()
        .map(|d| d.trim().to_string())
        .filter(|d| !d.is_empty());

    let mut session_layer = SessionManagerLayer::new(session_store)
        .with_secure(cookie_secure)
        .with_same_site(cookie_same_site)
        .with_name("summit_stats_session")
        .with_expiry(Expiry::OnInactivity(Duration::hours(1)));
    if let Some(domain) = cookie_domain {
        session_layer = session_layer.with_domain(domain);
    }

    let state = Arc::new(AppState {
        db: pool,
        client_id,
        client_secret,
        backend_url,
        strava_url,
        frontend_url,
        webhook_verify_token,
    });

    let app = routes::routes()
        .with_state(state)
        .layer(session_layer)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

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
