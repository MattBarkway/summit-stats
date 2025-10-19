locals {
  frontend_image = "${var.region}-docker.pkg.dev/${var.project_name}/${google_artifact_registry_repository.summit_stats_frontend_repo.repository_id}/strava_analyser:${var.frontend_image_tag}"
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "summit-stats-frontend"
  location = var.region
  project  = var.project_id
  deletion_protection = false

  template {
    service_account = google_service_account.cloud_run_sa.email
    containers {
      image = local.frontend_image

      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }
}

resource "google_cloud_run_service_iam_member" "frontend_invoker" {
  service    = google_cloud_run_v2_service.frontend.name
  location   = var.region
  role       = "roles/run.invoker"
  member     = "allUsers"
}
