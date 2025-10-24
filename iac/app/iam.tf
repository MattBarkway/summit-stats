resource "google_cloud_run_v2_service_iam_member" "backend_invoker" {
  project = var.project_name
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [google_cloud_run_v2_service.backend]
}

resource "google_cloud_run_service_iam_member" "frontend_invoker" {
  project = var.project_name
  service    = google_cloud_run_v2_service.frontend.name
  location   = var.region
  role       = "roles/run.invoker"
  member     = "allUsers"

  depends_on = [google_cloud_run_v2_service.frontend]

}