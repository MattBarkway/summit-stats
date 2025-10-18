resource "google_artifact_registry_repository" "summit_stats_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats images"
  cleanup_policy_dry_run = true
}
