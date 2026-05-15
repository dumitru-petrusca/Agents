import { InstancesClient } from '@google-cloud/compute';
import { z } from 'zod';
import { FunctionTool } from '@google/adk';

export const ListRunningVmsInput = z.object({
  project_id: z.string().describe("The GCP project ID (e.g. 'my-project')."),
});

export async function list_running_vms(args: z.infer<typeof ListRunningVmsInput>): Promise<any> {
  const client = new InstancesClient();
  
  const instancesScopedList = client.aggregatedListAsync(
    { project: args.project_id, filter: "status=RUNNING" }
  );

  const by_zone: Record<string, any[]> = {};
  let total = 0;

  for await (const [zone, scopedList] of instancesScopedList) {
    const vms = scopedList.instances;
    if (!vms || vms.length === 0) {
      continue;
    }
    const zone_name = zone.replace(/^zones\//, "");
    by_zone[zone_name] = vms.map((vm: any) => {
      let internal_ip: string | null = null;
      let external_ip: string | null = null;
      if (vm.networkInterfaces && vm.networkInterfaces.length > 0) {
        const iface = vm.networkInterfaces[0];
        internal_ip = iface.networkIP || null;
        if (iface.accessConfigs && iface.accessConfigs.length > 0) {
          for (const config of iface.accessConfigs) {
            if (config.natIP) {
              external_ip = config.natIP;
              break;
            }
          }
        }
      }
      return {
        name: vm.name,
        machine_type: vm.machineType ? vm.machineType.split("/").pop() : "",
        status: vm.status,
        internal_ip,
        external_ip,
      };
    });
    total += by_zone[zone_name].length;
  }

  const summary = Object.entries(by_zone)
    .map(([zone, vms]) => ({ zone, count: vms.length }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    by_zone,
    summary,
  };
}

export const listRunningVmsTool = new FunctionTool({
  name: 'list_running_vms',
  description: 'List all running VM instances in a project.',
  parameters: ListRunningVmsInput as any,
  execute: list_running_vms as any,
});
