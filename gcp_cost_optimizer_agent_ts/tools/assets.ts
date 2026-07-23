import { AssetServiceClient } from '@google-cloud/asset';
import { z } from 'zod';
import { FunctionTool } from '@google/adk';

export const ListResourcesInput = z.object({
  project_id: z.string().describe("The GCP project ID (e.g. 'my-project')."),
  asset_types: z.array(z.string()).default([]).describe("Optional list of asset types to filter by."),
});

export async function list_resources(args: z.infer<typeof ListResourcesInput>): Promise<any> {
  const client = new AssetServiceClient();
  const parent = `projects/${args.project_id}`;
  
  const [response] = await client.listAssets({
    parent,
    assetTypes: args.asset_types.length > 0 ? args.asset_types : undefined,
    contentType: 'RESOURCE',
    pageSize: 1000,
  });

  const by_type: Record<string, string[]> = {};
  for (const asset of response || []) {
    if (asset.assetType && asset.name) {
      if (!by_type[asset.assetType]) {
        by_type[asset.assetType] = [];
      }
      by_type[asset.assetType].push(asset.name);
    }
  }

  const summary = Object.entries(by_type)
    .map(([asset_type, names]) => ({ asset_type, count: names.length }))
    .sort((a, b) => b.count - a.count);

  const total = Object.values(by_type).reduce((sum, names) => sum + names.length, 0);

  return {
    total,
    by_type,
    summary,
  };
}

export const listResourcesTool = new FunctionTool({
  name: 'list_resources',
  description: 'List all GCP resources in a project, grouped by type.',
  parameters: ListResourcesInput as any,
  execute: list_resources as any,
});
