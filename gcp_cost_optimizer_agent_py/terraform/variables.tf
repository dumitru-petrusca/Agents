variable "project_id" {
  type        = string
  description = "The GCP Project ID to deploy resources in."
}

variable "region" {
  type        = string
  description = "The GCP region to deploy the Vertex AI Reasoning Engine."
  default     = "us-central1"
}

variable "staging_bucket" {
  type        = string
  description = "The name of the GCS bucket to stage agent deployment files (without gs:// prefix)."
}

variable "create_bucket" {
  type        = bool
  description = "Whether to create the GCS staging bucket. Set to false to use an existing bucket."
  default     = false
}
