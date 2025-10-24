resource "google_artifact_registry_repository" "summit_stats_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats backend images"
  cleanup_policy_dry_run = true

  cleanup_policies {
    id     = "keep-5-most-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }
}

resource "google_artifact_registry_repository" "summit_stats_frontend_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-frontend-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats frontend images"
  cleanup_policy_dry_run = true

  cleanup_policies {
    id     = "keep-5-most-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }
}

resource "google_artifact_registry_repository" "summit_stats_migrations_repo" {
  provider           = google
  location           = var.region
  repository_id      = "summit-stats-migrations-repo"
  format             = "DOCKER"
  description        = "Docker repo for SummitStats frontend images"
  cleanup_policy_dry_run = true

  cleanup_policies {
    id     = "keep-5-most-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }
}
