use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct TokenResponse {
    token_type: String,
    pub(crate) expires_at: i64,
    expires_in: u64,
    pub(crate) refresh_token: String,
    pub(crate) access_token: String,
    pub(crate) athlete: Athlete,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Athlete {
    pub id: i64,
    pub username: Option<String>,
    pub firstname: Option<String>,
    pub lastname: Option<String>,
}
