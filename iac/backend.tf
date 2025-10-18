terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "summit-stats-tfstate"
    prefix = "terraform/state"
  }
}
