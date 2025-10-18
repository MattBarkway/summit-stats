resource "github_actions_secret" "gcp_project_name" {
  repository = split("/", var.github_repo)[1]
  secret_name = "GCP_PROJECT_ID"
  plaintext_value = var.project_name
}

resource "github_actions_secret" "sa_email" {
  repository = split("/", var.github_repo)[1]
  secret_name = "SERVICE_ACCOUNT_EMAIL"
  plaintext_value = google_service_account.github_actions.email
}

resource "github_actions_secret" "wif_provider" {
  repository = split("/", var.github_repo)[1]
  secret_name = "WORKLOAD_IDENTITY_PROVIDER"
  plaintext_value = google_iam_workload_identity_pool_provider.github_provider.name
}

resource "github_actions_variable" "gcp_region" {
  repository    = split("/", var.github_repo)[1]
  variable_name = "GCP_REGION"
  value         = var.region
}
