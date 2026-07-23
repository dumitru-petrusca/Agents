import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';
import { FunctionTool } from '@google/adk';

export const ListAgentEnginesInput = z.object({
  project_id: z.string().describe("The GCP project ID."),
  location: z.string().default("us-central1").describe("Region (default 'us-central1')."),
});

export async function list_agent_engines(args: z.infer<typeof ListAgentEnginesInput>): Promise<any> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();

  const url = `https://${args.location}-aiplatform.googleapis.com/v1/projects/${args.project_id}/locations/${args.location}/reasoningEngines`;
  
  try {
    const response = await client.request({ url, method: 'GET' });
    const body: any = response.data;
    const engines = (body.reasoningEngines || []).map((e: any) => {
      const spec = e.spec || {};
      const name = e.name || "";
      const engine_id = name.includes("/") ? name.split("/").pop() : name;
      return {
        id: engine_id,
        display_name: e.displayName || "",
        description: e.description || "",
        framework: spec.agentFramework || "",
        created: e.createTime || "",
      };
    });
    return { total: engines.length, engines };
  } catch (err: any) {
    return { total: 0, engines: [], error: err.message };
  }
}

export const listAgentEnginesTool = new FunctionTool({
  name: 'list_agent_engines',
  description: 'List deployed Agent Engine (Reasoning Engine) instances in a project.',
  parameters: ListAgentEnginesInput as any,
  execute: list_agent_engines as any,
});
