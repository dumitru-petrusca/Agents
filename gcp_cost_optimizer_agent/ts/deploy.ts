/**
 * Deploy the GCP Cost Optimizer (TypeScript) to Vertex AI Agent Engine.
 */
import { GoogleAuth } from 'google-auth-library';
import * as child_process from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const PROJECT = process.env.PROJECT || "";
const PROJECT_NUMBER = process.env.PROJECT_NUMBER || "";
const LOCATION = process.env.LOCATION || "us-central1";
const STAGING_BUCKET = process.env.STAGING_BUCKET || "";

const AGENT_IAM_ROLES = [
  "roles/aiplatform.user",
  "roles/cloudasset.viewer",
  "roles/compute.viewer",
  "roles/container.viewer",
  "roles/run.viewer",
  "roles/aiplatform.viewer",
  "roles/bigquery.jobUser",
  "roles/bigquery.dataViewer",
];

async function main() {
  if (!PROJECT || !PROJECT_NUMBER || !STAGING_BUCKET) {
    console.error("Error: PROJECT, PROJECT_NUMBER, and STAGING_BUCKET must be set in .env");
    process.exit(1);
  }

  console.log("Deploying ADK TypeScript agent to Agent Engine with AGENT_IDENTITY (~2 min)...");
  
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const client = await auth.getClient();

  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/${LOCATION}/reasoningEngines`;
  
  const payload = {
    reasoningEngine: {
      displayName: "GCP Cost Optimizer (TS)",
      description: "Analyzes GCP resources and surfaces cost optimization recommendations (TypeScript ADK).",
      spec: {
        packageSpec: {
          identityType: "AGENT_IDENTITY",
          stagingBucket: STAGING_BUCKET,
        }
      }
    }
  };

  try {
    const response = await client.request({ url, method: 'POST', data: payload });
    const remote: any = response.data;
    const resourceName = remote.name;
    const agentId = resourceName.split("/").pop();

    console.log(`\nDeployed: ${resourceName}`);
    console.log("\nGranting agent identity IAM roles...");
    grantAgentIam(agentId);

    console.log("\nDone.");
  } catch (err: any) {
    console.error(`Deployment failed: ${err.message}`);
    if (err.response && err.response.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    }
  }
}

function grantAgentIam(agentId: string) {
  const principal = `principal://agents.global.proj-${PROJECT_NUMBER}.system.id.goog/resources/aiplatform/projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${agentId}`;

  for (const role of AGENT_IAM_ROLES) {
    console.log(`  Granting ${role}...`);
    const res = child_process.spawnSync(
      "gcloud", ["projects", "add-iam-policy-binding", PROJECT, `--member=${principal}`, `--role=${role}`, "--quiet"],
      { encoding: 'utf-8' }
    );
    if (res.status !== 0) {
      console.log(`  WARNING: ${res.stderr?.trim()}`);
    } else {
      console.log(`  ✓ ${role}`);
    }
  }
}

main();
