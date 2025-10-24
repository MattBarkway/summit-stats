locals {
  artifact_repositories = {
    backend = {
      repository_id = "summit-stats-backend-repo"
      description   = "Docker repo for SummitStats backend images"
    }
    frontend = {
      repository_id = "summit-stats-frontend-repo"
      description   = "Docker repo for SummitStats frontend images"
    }
    migrations = {
      repository_id = "summit-stats-migrations-repo"
      description   = "Docker repo for SummitStats migration images"
    }
  }
}

resource "google_artifact_registry_repository" "summit_stats" {
  for_each          = local.artifact_repositories
  provider          = google
  location          = var.region
  repository_id     = each.value.repository_id
  format            = "DOCKER"
  description       = each.value.description

  cleanup_policies {
    id     = "keep-5-most-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }

  cleanup_policies {
    id     = "delete-over-5"
    action = "DELETE"

    condition {
      older_than = "1d"
    }
  }
}
