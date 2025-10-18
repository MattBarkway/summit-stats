variable "project_name" {
  description = "GCP project name"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west1"
}

variable "github_repo" {
  description = "GitHub repo in format 'owner/repo'"
  type        = string
}

variable "owner_id" {
  description = "Repo owner's GitHub user ID"
  type        = string
}


variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "backend_image_tag" {
  description = "Tag for the latest backend image"
  type        = string
}

variable "client_id" {
  description = "Strava client ID"
  type        = string
  sensitive   = true
}

variable "client_secret" {
  description = "Strava client secret"
  type        = string
  sensitive   = true
}