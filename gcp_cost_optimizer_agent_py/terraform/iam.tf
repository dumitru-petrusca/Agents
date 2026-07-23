locals {
  agent_roles = [
    "roles/aiplatform.admin",
    "roles/aiplatform.agentContextEditor",
    "roles/aiplatform.agentDefaultAccess",
    "roles/bigquery.admin",
    "roles/cloudasset.viewer",
    "roles/compute.viewer",
    "roles/container.viewer",
    "roles/run.viewer",
  ]
}

resource "google_project_iam_member" "agent_roles" {
  for_each = toset(local.agent_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${var.service_account_email}"
}
