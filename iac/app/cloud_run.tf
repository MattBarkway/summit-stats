locals {
  images = {
    for k, v in google_artifact_registry_repository.summit_stats :
    k => "${var.region}-docker.pkg.dev/${var.project_name}/${v.repository_id}/summit-stats-${k}:${var.latest_image_tag}"
  }
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "strava-analyser-backend"
  location = var.region
  project  = var.project_name
  deletion_protection = false

  template {
    service_account =  data.terraform_remote_state.bootstrap.outputs.cloud_run_sa_email
    containers {
      image = local.images["backend"]
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
        name  = "BACKEND_URL"
        value = "https://api.summit-stats.co.uk"
      }
      env {
        name  = "FRONTEND_URL"
        value = "https://summit-stats.co.uk"
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
      connector =  data.terraform_remote_state.bootstrap.outputs.cloud_run_connector_id
    }

  }
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
    service_account =  data.terraform_remote_state.bootstrap.outputs.cloud_run_sa_email
    containers {
      image = local.images["frontend"]
    }
  }
}

resource "google_cloud_run_v2_job" "db_migrate" {
  name     = "db-migrate"
  location = var.region
  project  = var.project_name
  deletion_protection = false
  template {
    template {
      service_account =  data.terraform_remote_state.bootstrap.outputs.cloud_run_sa_email
      vpc_access {
        connector =  data.terraform_remote_state.bootstrap.outputs.cloud_run_connector_id
        egress    = "ALL_TRAFFIC"
      }
      containers {
        image = local.images["migrations"]
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
