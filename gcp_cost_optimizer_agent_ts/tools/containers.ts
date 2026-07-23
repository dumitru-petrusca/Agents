import { ClusterManagerClient } from '@google-cloud/container';
import { ServicesClient } from '@google-cloud/run';
import { z } from 'zod';
import { FunctionTool } from '@google/adk';

export const ListGkeClustersInput = z.object({
  project_id: z.string().describe("The GCP project ID."),
});

export async function list_gke_clusters(args: z.infer<typeof ListGkeClustersInput>): Promise<any> {
  const client = new ClusterManagerClient();
  const parent = `projects/${args.project_id}/locations/-`;
  const [response] = await client.listClusters({ parent });

  const clusters = (response.clusters || []).map((cluster: any) => {
    let node_count = 0;
    let machine_type = "";
    for (const pool of cluster.nodePools || []) {
      node_count += pool.initialNodeCount || 0;
      if (!machine_type && pool.config) {
        machine_type = pool.config.machineType || "";
      }
    }
    let statusName = "UNKNOWN";
    if (cluster.status !== undefined) {
      statusName = cluster.status.toString();
    }
    return {
      name: cluster.name,
      location: cluster.location,
      status: statusName,
      node_count,
      machine_type,
      master_version: cluster.currentMasterVersion,
    };
  });

  return { total: clusters.length, clusters };
}

export const listGkeClustersTool = new FunctionTool({
  name: 'list_gke_clusters',
  description: 'List all GKE clusters in a project.',
  parameters: ListGkeClustersInput as any,
  execute: list_gke_clusters as any,
});

export const ListCloudRunServicesInput = z.object({
  project_id: z.string().describe("The GCP project ID."),
  region: z.string().default("us-central1").describe("Region to query (default 'us-central1')."),
});

export async function list_cloud_run_services(args: z.infer<typeof ListCloudRunServicesInput>): Promise<any> {
  const client = new ServicesClient();
  const parent = `projects/${args.project_id}/locations/${args.region}`;

  const [response] = await client.listServices({ parent });
  const services = (response || []).map((svc: any) => ({
    name: svc.name ? svc.name.split("/").pop() : "",
    region: args.region,
    uri: svc.uri,
    last_modifier: svc.lastModifier,
    update_time: svc.updateTime ? new Date(svc.updateTime.seconds * 1000).toISOString() : "",
  }));

  return { total: services.length, services };
}

export const listCloudRunServicesTool = new FunctionTool({
  name: 'list_cloud_run_services',
  description: 'List Cloud Run services in a project and region.',
  parameters: ListCloudRunServicesInput as any,
  execute: list_cloud_run_services as any,
});
