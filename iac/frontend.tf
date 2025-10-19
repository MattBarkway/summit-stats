resource "google_cloud_run_v2_service" "frontend" {
  name     = "summit-stats-frontend"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/summit-stats-frontend-repo/frontend:${var.frontend_image_tag}"

      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }

  traffic {
    latest_revision = true
    percent         = 100
  }
}

resource "google_cloud_run_service_iam_member" "frontend_invoker" {
  service    = google_cloud_run_v2_service.frontend.name
  location   = var.region
  role       = "roles/run.invoker"
  member     = "allUsers"
}
