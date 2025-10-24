output "cloud_run_connector_name" {
  value = google_vpc_access_connector.cloud_run_connector.name
}

output "cloud_run_connector_id" {
  value = google_vpc_access_connector.cloud_run_connector.id
}

output "cloud_run_sa_email" {
value = google_service_account.cloud_run_sa.email
}

output "github_provider_name" {
  value = "principalSet://iam.googleapis.com/projects/${var.project_id}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_pool.workload_identity_pool_id}/attribute.repository/${var.github_repo}"
}

output "github_actions_email" {
  value = google_service_account.github_actions.email
}
