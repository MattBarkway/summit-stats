resource "random_password" "db_password" {
  length  = 32
  special = true

  keepers = {
    project = var.project_id
  }
}

resource "google_sql_database_instance" "postgres" {
  name             = "strava-backend-db"
  database_version = "POSTGRES_17"
  region           = var.region
  project = var.project_name

  settings {
    tier = "db-f1-micro"

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_name}/global/networks/default"
    }
  }
}

resource "google_sql_database" "default" {
  name     = "strava_db"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "default" {
  name     = "strava_user"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
