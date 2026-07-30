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

locals {
  # The agent runs under Vertex AI Reasoning Engine Agent Identity.
  # Format: principal://agents.global.proj-${PROJECT_NUMBER}.system.id.goog/resources/aiplatform/projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${AGENT_ID}
  reasoning_engine_id = split("/", google_vertex_ai_reasoning_engine.agent.id)[5]
  agent_principal     = "principal://agents.global.proj-${data.google_project.project.number}.system.id.goog/resources/aiplatform/projects/${data.google_project.project.number}/locations/${var.region}/reasoningEngines/${local.reasoning_engine_id}"
}

