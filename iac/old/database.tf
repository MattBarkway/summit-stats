# Random password
resource "random_password" "db_password" {
  length  = 32
  special = true

  keepers = {
    project = var.project_id
  }
}

resource "google_compute_global_address" "private_service_ip" {
  name          = "google-managed-services-${var.project_name}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = "default"
}

resource "google_service_networking_connection" "private_vpc_peering" {
  network                 = "projects/${var.project_name}/global/networks/default"
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_ip.name]
}

# VPC connector for Cloud Run -> Cloud SQL private IP
resource "google_vpc_access_connector" "cloud_run_connector" {
  name   = "cloud-run-connector"
  region = var.region
  network = "default"
  ip_cidr_range = "10.8.0.0/28"  # small range for connector
  min_instances = 2
  max_instances = 3
}

# Cloud SQL instance with private IP
resource "google_sql_database_instance" "postgres" {
  name             = "strava-backend-db"
  database_version = "POSTGRES_17"
  region           = var.region
  project = var.project_name

  settings {
    tier = "db-f1-micro"

    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_name}/global/networks/default"
    }
  }

  depends_on = [
    google_service_networking_connection.private_vpc_peering
  ]
}

# Cloud SQL database
resource "google_sql_database" "default" {
  name     = "strava_db"
  instance = google_sql_database_instance.postgres.name
}

# Cloud SQL user
resource "google_sql_user" "default" {
  name     = "strava_user"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
