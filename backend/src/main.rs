use std::sync::Arc;

mod routes;

#[derive(Clone)]
struct AppState {
    client_id: String,
    client_secret: String,
    redirect_uri: String,
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

    let state = Arc::new(AppState {
        client_id,
        client_secret,
        redirect_uri,
    });

    // let state = AppState {
    //     client_id,
    //     client_secret,
    //     redirect_uri,
    // };
    let app = routes::routes().with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
