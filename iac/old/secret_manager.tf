resource "google_secret_manager_secret" "db_password" {
  secret_id = "strava-db-password"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "client_id" {
  secret_id = "strava-client-id"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "client_id" {
  secret      = google_secret_manager_secret.client_id.id
  secret_data = var.client_id
}

resource "google_secret_manager_secret" "client_secret" {
  secret_id = "strava-client-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "client_secret" {
  secret      = google_secret_manager_secret.client_secret.id
  secret_data = var.client_secret
}