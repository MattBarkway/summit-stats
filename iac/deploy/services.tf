locals {
  backend_image = "${var.region}-docker.pkg.dev/${var.project_name}/${google_artifact_registry_repository.summit_stats_repo.repository_id}/strava_analyser:${var.backend_image_tag}"
  frontend_image = "${var.region}-docker.pkg.dev/${var.project_name}/${google_artifact_registry_repository.summit_stats_frontend_repo.repository_id}/summit-stats-frontend:${var.frontend_image_tag}"
}

# ----------------------------
# Cloud Run backend service
# ----------------------------
resource "google_cloud_run_v2_service" "backend" {
  name     = "strava-analyser-backend"
  location = var.region
  project  = var.project_name
  deletion_protection = false

  template {
    service_account = data.terraform_remote_state.bootstrap.outputs.cloud_run_sa_email
    containers {
      image = local.backend_image
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
      env {
        name  = "STRAVA_URL"
        value = "https://www.strava.com"
      }
      env {
        name  = "REDIRECT_URI"
        value = "https://strava-analyser-backend-uvfmgnanga-ew.a.run.app/auth/strava/callback"
      }
      env {
        name  = "FRONTEND_URL"
        value = "https://summit-stats-frontend-845129361007.europe-west1.run.app"
      }

      env {
        name = "CLIENT_ID"
        value_source {
          secret_key_ref {
            secret = google_secret_manager_secret.client_id.secret_id
            version = google_secret_manager_secret_version.client_id.version
          }
        }
      }
      env {
        name = "CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret = google_secret_manager_secret.client_secret.secret_id
            version = google_secret_manager_secret_version.client_secret.version
          }
        }
      }

    }

    vpc_access {
      connector = data.terraform_remote_state.bootstrap.cloud_run_connector_id
    }
  }
}

locals {
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "summit-stats-frontend"
  location = var.region
  project  = var.project_id
  deletion_protection = false

  template {
    scaling {
      max_instance_count = 2
    }
    service_account = data.terraform_remote_state.bootstrap.outputs.cloud_run_sa_email
    containers {
      image = local.frontend_image

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }
}