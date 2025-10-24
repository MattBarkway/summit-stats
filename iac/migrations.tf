resource "google_cloud_run_v2_job" "db_migrate" {
  name     = "db-migrate"
  location = var.region
  project  = var.project_name

  template {
    template {
      service_account = google_service_account.cloud_run_sa.email
      vpc_access {
        connector = google_vpc_access_connector.cloud_run_connector.id
        egress    = "ALL_TRAFFIC"
      }
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_name}/summit-stats-repo/db_migrate:${var.backend_image_tag}"
        env {
          name  = "DATABASE_USER"
          value = google_sql_user.default.name
        }
        env {
          name = "DATABASE_PASSWORD"
          value_source {
          secret_key_ref {
          secret = google_secret_manager_secret.db_password.secret_id
          version = google_secret_manager_secret_version.db_password.version
          }
          }
        }
        env {
          name  = "DATABASE_NAME"
          value = google_sql_database.default.name
        }
        env {
          name  = "DATABASE_HOST"
          value = google_sql_database_instance.postgres.private_ip_address
        }
      }
    }
  }
}
