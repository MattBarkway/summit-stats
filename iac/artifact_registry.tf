resource "google_artifact_registry_repository" "summit_stats_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats backend images"
  cleanup_policy_dry_run = true
}

resource "google_artifact_registry_repository" "summit_stats_frontend_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-frontend-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats frontend images"
  cleanup_policy_dry_run = true
}
