terraform {
  required_version = ">= 1.5.0"

  backend "gcs" {
    bucket = "summit-stats-tfstate-app"
    prefix = "terraform/state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_name
  region  = var.region
}

provider "github" {
  owner = split("/", var.github_repo)[0]
  token = var.github_token
}

data "terraform_remote_state" "bootstrap" {
  backend = "gcs"
  config = {
    bucket = "summit-stats-tfstate-bootstrap"
    prefix = "terraform/state"
  }
}
