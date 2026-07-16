terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    null = {
      source  = "hashicorp/null"
      version = ">= 3.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Look up GCP Project details (specifically project number for IAM Workload Identity principal)
data "google_project" "project" {
  project_id = var.project_id
}

# Optional GCS Staging Bucket
resource "google_storage_bucket" "staging" {
  count         = var.create_bucket ? 1 : 0
  name          = var.staging_bucket
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 14 # automatically delete old packages after 14 days to prevent costs
    }
    action {
      type = "Delete"
    }
  }
}

# Automate local packaging step as a Terraform pre-requisite
resource "null_resource" "package_agent" {
  triggers = {
    # Triggers packaging when agent source files or tools directory modify
    # Uses MD5 hashes of the primary python files to detect changes
    agent_hash   = filemd5("${path.module}/../agent.py")
    packager_hash = filemd5("${path.module}/../package_agent.py")
  }

  provisioner "local-exec" {
    command = "cd ${path.module}/.. && ./.venv/bin/python3 package_agent.py"
  }
}

# Staged files to upload to GCS
resource "google_storage_bucket_object" "pickle" {
  name   = "cost_optimizer_agent/reasoning_engine.pkl"
  source = "${path.module}/../build/reasoning_engine.pkl"
  bucket = var.staging_bucket

  # Make sure this resource waits for the bucket and packaging to complete
  depends_on = [
    google_storage_bucket.staging,
    null_resource.package_agent
  ]
}

resource "google_storage_bucket_object" "dependencies" {
  name   = "cost_optimizer_agent/dependencies.tar.gz"
  source = "${path.module}/../build/dependencies.tar.gz"
  bucket = var.staging_bucket

  depends_on = [
    google_storage_bucket.staging,
    null_resource.package_agent
  ]
}

resource "google_storage_bucket_object" "requirements" {
  name   = "cost_optimizer_agent/requirements.txt"
  source = "${path.module}/../build/requirements.txt"
  bucket = var.staging_bucket

  depends_on = [
    google_storage_bucket.staging,
    null_resource.package_agent
  ]
}

# Deploy the Vertex AI Reasoning Engine (Agent Engine)
resource "google_vertex_ai_reasoning_engine" "agent" {
  display_name = "GCP Cost Optimizer"
  description  = "Analyzes GCP resources and surfaces cost optimization recommendations."
  region       = var.region

  spec {
    agent_framework = "google-adk"

    package_spec {
      python_version           = "3.11"
      pickle_object_gcs_uri    = "gs://${var.staging_bucket}/${google_storage_bucket_object.pickle.name}"
      dependency_files_gcs_uri = "gs://${var.staging_bucket}/${google_storage_bucket_object.dependencies.name}"
      requirements_gcs_uri     = "gs://${var.staging_bucket}/${google_storage_bucket_object.requirements.name}"
    }
  }
}

# Calculate agent principal and assign required IAM permissions dynamically
locals {
  # Extract the reasoning engine ID from the full ID path outputted by Terraform
  # Example: projects/{project}/locations/{location}/reasoningEngines/{reasoning_engine_id}
  reasoning_engine_id = element(split("/", google_vertex_ai_reasoning_engine.agent.id), length(split("/", google_vertex_ai_reasoning_engine.agent.id)) - 1)

  # Workload Identity Principal format for Reasoning Engine agent identity
  agent_principal = "principal://agents.global.proj-${data.google_project.project.number}.system.id.goog/resources/aiplatform/projects/${data.google_project.project.number}/locations/${var.region}/reasoningEngines/${local.reasoning_engine_id}"
}

# Least-Privilege Custom IAM Role generated via Policy Lens static analysis scanner
resource "google_project_iam_custom_role" "agent_custom_role" {
  project     = var.project_id
  role_id     = "gcp_cost_optimizer_agent"
  title       = "GCP Cost Optimizer Agent Custom Role"
  description = "Least-privilege permissions determined by Policy Lens static code analysis scanner."
  stage       = "GA"

  permissions = [
    # --- Cloud Asset Inventory (list_resources tool) ---
    "cloudasset.assets.searchAllResources",

    # --- Compute Engine (list_running_vms tool) ---
    "compute.instances.list",

    # --- Kubernetes Engine (list_gke_clusters tool) ---
    "container.clusters.list",

    # --- Cloud Run (list_cloud_run_services tool) ---
    "run.services.list",

    # --- BigQuery Billing Data (query_billing tool) ---
    "bigquery.datasets.get",
    "bigquery.jobs.create",
    "bigquery.tables.list",

    # --- Vertex AI Model Predictions & Agent Engines (Gemini calls & list_agent_engines tool) ---
    "aiplatform.endpoints.predict",
    "aiplatform.reasoningEngines.predict",
    "aiplatform.reasoningEngines.list",
    "aiplatform.reasoningEngines.get",
  ]
}

# Grant the Dynamic Agent Identity its Least-Privilege Custom IAM Role
resource "google_project_iam_member" "agent_iam" {
  project = var.project_id
  role    = google_project_iam_custom_role.agent_custom_role.id
  member  = local.agent_principal
}
