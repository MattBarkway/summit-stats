use sqlx::PgPool;
use strava_wrapper::api::StravaAPI;
use strava_wrapper::auth;

pub struct UserStravaClient {
    url: String,
    api: StravaAPI,
    refresh_token: String,
    expires_at: i64,
    db: PgPool,
    athlete_id: i64,
}

impl UserStravaClient {
    pub async fn new(db: PgPool, athlete_id: i64, strava_url: &str) -> Result<Self, String> {
        let row = sqlx::query!(
            "SELECT access_token, refresh_token, expires_at FROM tokens WHERE athlete_id = $1",
            athlete_id
        )
        .fetch_one(&db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Self {
            api: StravaAPI::new(&format!("{}/api", strava_url), row.access_token),
            url: strava_url.to_string(),
            refresh_token: row.refresh_token,
            expires_at: row.expires_at,
            db,
            athlete_id,
        })
    }

    pub async fn ensure_token(
        &mut self,
        client_id: u32,
        client_secret: &str,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp();
        if self.expires_at > now {
            return Ok(());
        }

        let refreshed = auth::refresh_token_at(
            &format!("{}/oauth/token", &self.url),
            client_id,
            client_secret,
            &self.refresh_token,
        )
        .await
        .map_err(|e| format!("refresh_token failed: {:?}", e))?;

        self.refresh_token = refreshed.refresh_token;
        self.expires_at = refreshed.expires_at as i64;
        self.api.set_token(refreshed.access_token.clone());

        sqlx::query!(
            "UPDATE tokens SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE athlete_id = $4",
            refreshed.access_token,
            self.refresh_token,
            self.expires_at,
            self.athlete_id
        )
        .execute(&self.db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn api(&self) -> &StravaAPI {
        &self.api
    }
}
