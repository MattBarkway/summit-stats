use sqlx::PgPool;
use std::sync::Arc;
use strava_wrapper::api::StravaAPI;

pub struct UserStravaClient {
    api: StravaAPI,
    access_token: String,
    refresh_token: String,
    expires_at: i64,
    db: PgPool,
    athlete_id: i64,
}

impl UserStravaClient {
    pub async fn new(db: PgPool, athlete_id: i64) -> Result<Self, String> {
        let row = sqlx::query!(
            "SELECT access_token, refresh_token, expires_at FROM tokens WHERE athlete_id = $1",
            athlete_id
        )
        .fetch_one(&db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(Self {
            api: StravaAPI::new("https://www.strava.com/api", row.access_token.clone()),
            access_token: row.access_token,
            refresh_token: row.refresh_token,
            expires_at: row.expires_at,
            db,
            athlete_id,
        })
    }

    pub async fn ensure_token(
        &mut self,
        client_id: &str,
        client_secret: &str,
    ) -> Result<(), String> {
        let now = chrono::Utc::now().timestamp();
        if self.expires_at <= now {
            let client = reqwest::Client::new();
            let mut form = std::collections::HashMap::new();
            form.insert("client_id", client_id);
            form.insert("client_secret", client_secret);
            form.insert("grant_type", "refresh_token");
            form.insert("refresh_token", &self.refresh_token);

            let res = client
                .post("https://www.strava.com/oauth/token")
                .form(&form)
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !res.status().is_success() {
                return Err(format!("Failed to refresh token: {:?}", res.text().await));
            }

            let token_response: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
            self.access_token = token_response["access_token"].as_str().unwrap().to_string();
            self.refresh_token = token_response["refresh_token"]
                .as_str()
                .unwrap()
                .to_string();
            self.expires_at = token_response["expires_at"].as_i64().unwrap();

            // Update DB
            sqlx::query!(
                "UPDATE tokens SET access_token = $1, refresh_token = $2, expires_at = $3 WHERE athlete_id = $4",
                self.access_token,
                self.refresh_token,
                self.expires_at,
                self.athlete_id
            )
                .execute(&self.db)
                .await
                .map_err(|e| e.to_string())?;

            self.api = StravaAPI::new("https://www.strava.com/api", &self.access_token);
        }

        Ok(())
    }

    pub fn api(&self) -> &StravaAPI {
        &self.api
    }
}
