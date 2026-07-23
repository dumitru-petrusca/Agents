locals {
  reasoning_engine_id = element(split("/", google_vertex_ai_reasoning_engine.agent.id), 5)
  agent_principal     = "principal://agents.global.proj-\${data.google_project.project.number}.system.id.goog/resources/aiplatform/projects/\${data.google_project.project.number}/locations/\${var.region}/reasoningEngines/\${local.reasoning_engine_id}"
}

resource "google_project_iam_member" "agent_roles" {
  for_each = toset([
    "roles/aiplatform.admin",
    "roles/bigquery.admin",
    "roles/cloudasset.viewer",
    "roles/compute.viewer",
    "roles/container.viewer",
    "roles/run.viewer"
  ])

  project = var.project_id
  role    = each.key
  member  = local.agent_principal
}
