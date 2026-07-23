output "reasoning_engine_id" {
  value       = local.reasoning_engine_id
  description = "The dynamic resource ID of the deployed Vertex AI Reasoning Engine."
}

output "reasoning_engine_name" {
  value       = google_vertex_ai_reasoning_engine.agent.id
  description = "The full GCP resource name of the deployed Reasoning Engine."
}

output "agent_principal" {
  value       = local.agent_principal
  description = "The Workload Identity principal used by the deployed agent."
}
