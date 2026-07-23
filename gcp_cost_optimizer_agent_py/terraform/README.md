# Declarative Terraform Deployment for GCP Cost Optimizer Agent

This directory contains a declarative, enterprise-ready **Infrastructure as Code (IaC)** solution to deploy the GCP Cost Optimizer agent to **Vertex AI Reasoning Engine (Agent Engine)**.

---

## How it Works

1. **Automated Local Packaging:** Terraform automatically executes the custom Python packaging script (`package_agent.py`) if any local agent code or tool definitions change.
2. **Staged Uploads:** The generated build artifacts (`reasoning_engine.pkl`, `dependencies.tar.gz`, and `requirements.txt`) are automatically uploaded to your Google Cloud Storage staging bucket.
3. **Agent Registration:** The `google_vertex_ai_reasoning_engine` resource registers the agent in Vertex AI using the uploaded staging artifacts.
4. **Least-Privilege Custom IAM Role:** Instead of standard broad roles, the dynamically created Workload Identity principal is granted a project-level custom IAM role loaded with the exact granular GCP permissions identified by the **Policy Lens** static scanner.

---

## Security & Least Privilege (Policy Lens)

To enforce the principle of least privilege, the agent permissions in `main.tf` were audited and generated using the **Policy Lens** static analysis engine.

To re-run or audit the agent's GCP library usage and generate permissions:
```bash
# From this directory, scan the parent python agent codebase:
/Users/petrusca/.agents/skills/iam-policy-lens/.venv/bin/python3 /Users/petrusca/.agents/skills/iam-policy-lens/scripts/python/analyzer.py ../ | /Users/petrusca/.agents/skills/iam-policy-lens/.venv/bin/python3 /Users/petrusca/.agents/skills/iam-policy-lens/scripts/policy/policy.py
```

---

## Prerequisites

1. **Terraform CLI:** Install the Terraform CLI (>= 1.3.0).
2. **Google Cloud SDK (gcloud):** Ensure you are authenticated to your target Google Cloud Project:
   ```bash
   gcloud auth application-default login
   ```
3. **Staged Build Artifacts:** Ensure your local Python virtual environment is configured:
   ```bash
   cd ..
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

---

## Getting Started

1. **Initialize Terraform:**
   Initialize the Google and Null providers:
   ```bash
   terraform init
   ```

2. **Configure Variables:**
   Copy the example variables file and configure it with your target project ID and staging bucket name:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   Open `terraform.tfvars` and edit the settings:
   ```hcl
   project_id     = "your-gcp-project"
   staging_bucket = "your-staging-bucket"
   create_bucket  = true  # Set to true if you want TF to create the bucket for you
   ```

3. **Review Deployment Plan:**
   Generate and inspect the execution plan:
   ```bash
   terraform plan
   ```

4. **Apply Deployment:**
   Apply the plan to package, stage, deploy, and configure IAM role bindings automatically:
   ```bash
   terraform apply
   ```

5. **Destroy (Tear Down):**
   To completely delete the Reasoning Engine and automatically purge all Dynamic IAM role bindings, run:
   ```bash
   terraform destroy
   ```
