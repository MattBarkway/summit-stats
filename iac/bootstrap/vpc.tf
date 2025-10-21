resource "google_vpc_access_connector" "cloud_run_connector" {
  name   = "cloud-run-connector"
  region = var.region
  network = "default"
  ip_cidr_range = "10.8.0.0/28"  # small range for connector
  min_instances = 2
  max_instances = 3
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