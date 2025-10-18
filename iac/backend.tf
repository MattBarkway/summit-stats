terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "summit-stats-tfstate"
    prefix = "terraform/state"
  }
}

locals {
  backend_image = "${var.region}-docker.pkg.dev/${var.project_name}/${google_artifact_registry_repository.summit_stats_repo.repository_id}/strava_analyser:${var.backend_image_tag}"
}

output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
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
    service_account = google_service_account.cloud_run_sa.email
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
        value = "http://localhost:8080/auth/strava/callback"
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
      connector = google_vpc_access_connector.cloud_run_connector.id
    }

  }
    depends_on =     [
      google_service_account.cloud_run_sa
    ]
}


resource "google_service_account" "cloud_run_sa" {
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run Service Account"
  project = var.project_name
}

locals {
  cloud_run_sa_roles = {
    "cloudsql_client"         = "roles/cloudsql.client"
    "artifact_reader"         = "roles/artifactregistry.reader"
    "secret_accessor"         = "roles/secretmanager.secretAccessor"
  }
}

resource "google_project_iam_member" "cloud_run_sa_roles" {
  for_each = local.cloud_run_sa_roles

  project = var.project_id
  role    = each.value
  member  = google_service_account.cloud_run_sa.member
}