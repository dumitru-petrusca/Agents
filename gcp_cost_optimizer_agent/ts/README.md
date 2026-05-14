# GCP Cost Optimizer Agent (TypeScript)

A TypeScript implementation of the GCP Cost Optimizer Agent using the Google ADK (`@google/adk`).

## Architecture & Functionality
Matches the exact functionality of the Python and Go implementations:
- **Primary Discovery**: Uses Cloud Asset Inventory (`list_resources`) to find all GCP resources.
- **Drill-down Tools**: Specialized tools for Compute Engine (`list_running_vms`), GKE (`list_gke_clusters`), Cloud Run (`list_cloud_run_services`), and Vertex AI Reasoning Engines (`list_agent_engines`).
- **Billing Analysis**: Integrates with BigQuery billing exports (`query_billing`) to quantify actual spend.
- **Deployment**: Supports Vertex AI Agent Engine deployment with per-agent identity (`AGENT_IDENTITY`).

## Setup & Execution
```bash
npm install
npm run build
npm start
```
