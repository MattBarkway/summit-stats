resource "github_actions_secret" "sa_email" {
  repository = split("/", var.github_repo)[1]
  secret_name = "SERVICE_ACCOUNT_EMAIL"
  plaintext_value =  data.terraform_remote_state.bootstrap.outputs.github_actions_email
}

resource "github_actions_secret" "wi_provider" {
  repository = split("/", var.github_repo)[1]
  secret_name = "WORKLOAD_IDENTITY_PROVIDER"
  plaintext_value =  data.terraform_remote_state.bootstrap.outputs.github_provider_name
}

resource "github_actions_variable" "gcp_region" {
  repository    = split("/", var.github_repo)[1]
  variable_name = "GCP_REGION"
  value         = var.region
}

resource "github_actions_variable" "backend_url" {
  repository    = split("/", var.github_repo)[1]
  variable_name = "BACKEND_URL"
  value         = "https://api.summit-stats.co.uk"
}

resource "github_actions_secret" "owner_id" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "OWNER_ID"
  plaintext_value         = var.owner_id
}

resource "github_actions_secret" "project_id" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "PROJECT_ID"
  plaintext_value         = var.project_id
}

resource "github_actions_secret" "project_name" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "PROJECT_NAME"
  plaintext_value         = var.project_name
}

resource "github_actions_secret" "client_id" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "CLIENT_ID"
  plaintext_value         = var.client_id
}

resource "github_actions_secret" "client_secret" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "CLIENT_SECRET"
  plaintext_value         = var.client_secret
}

resource "github_actions_secret" "github_token" {
  repository    = split("/", var.github_repo)[1]
  secret_name = "GH_TOKEN"
  plaintext_value         = var.github_token
}
