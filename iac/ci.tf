resource "google_service_account" "github_actions" {
  account_id   = "github-actions"
  display_name = "GitHub Actions deployer"
}

resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "OIDC pool for GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "Trusts tokens from GitHub OIDC"

  attribute_condition = <<EOT
    assertion.repository_owner_id == "${var.owner_id}" &&
    attribute.repository == "${var.github_repo}"
EOT

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.aud"        = "assertion.aud"
    "attribute.repository" = "assertion.repository"
  }
}

resource "google_service_account_iam_binding" "github_impersonation" {
  service_account_id = "projects/${var.project_name}/serviceAccounts/github-actions@${var.project_name}.iam.gserviceaccount.com"

  role = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/projects/${var.project_id}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.github_repo}"
  ]
}

resource "google_project_iam_member" "artifact_writer" {
  project = var.project_name
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

