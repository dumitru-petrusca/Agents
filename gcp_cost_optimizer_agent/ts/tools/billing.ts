import { BigQuery } from '@google-cloud/bigquery';
import { z } from 'zod';
import { FunctionTool } from '@google/adk';

export const QueryBillingInput = z.object({
  project_id: z.string().describe("The GCP project ID to query billing for."),
  billing_table: z.string().default("").describe("Fully qualified BigQuery table name."),
  days: z.number().default(30).describe("Number of days to look back (default 30)."),
});

async function discover_billing_table(client: BigQuery, project_id: string): Promise<string | null> {
  try {
    const dataset = client.dataset("billing_export");
    const [tables] = await dataset.getTables();
    for (const table of tables) {
      if (table.id && table.id.startsWith("gcp_billing_export")) {
        return `${project_id}.billing_export.${table.id}`;
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

export async function query_billing(args: z.infer<typeof QueryBillingInput>): Promise<any> {
  const client = new BigQuery({ projectId: args.project_id });
  let table = args.billing_table;

  if (!table) {
    const discovered = await discover_billing_table(client, args.project_id);
    if (!discovered) {
      return {
        error: "No billing export table found. Billing export may not be configured. See: https://cloud.google.com/billing/docs/how-to/export-data-bigquery",
        total_cost: 0,
        by_service: [],
        top_skus: [],
        currency: "USD",
      };
    }
    table = discovered;
  }

  const query = `
    SELECT
        service.description AS service,
        sku.description AS sku,
        SUM(cost) + SUM(IFNULL(
            (SELECT SUM(c.amount) FROM UNNEST(credits) c), 0
        )) AS net_cost,
        currency
    FROM \`${table}\`
    WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${args.days} DAY)
      AND project.id = @project_id
    GROUP BY service, sku, currency
    ORDER BY net_cost DESC
  `;

  try {
    const [rows] = await client.query({
      query,
      params: { project_id: args.project_id },
    });

    if (!rows || rows.length === 0) {
      return { total_cost: 0, by_service: [], top_skus: [], currency: "USD" };
    }

    const currency = rows[0].currency || "USD";
    const by_service: Record<string, number> = {};

    for (const row of rows) {
      const svc = row.service || "Other";
      by_service[svc] = (by_service[svc] || 0) + (row.net_cost || 0);
    }

    const total_cost = Math.round(Object.values(by_service).reduce((a, b) => a + b, 0) * 100) / 100;
    const by_service_list = Object.entries(by_service)
      .map(([service, cost]) => ({ service, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => b.cost - a.cost);

    const top_skus = rows.slice(0, 20).map(r => ({
      service: r.service,
      sku: r.sku,
      cost: Math.round((r.net_cost || 0) * 100) / 100,
    }));

    return {
      total_cost,
      by_service: by_service_list,
      top_skus,
      currency,
    };
  } catch (err: any) {
    return { total_cost: 0, by_service: [], top_skus: [], currency: "USD", error: err.message };
  }
}

export const queryBillingTool = new FunctionTool({
  name: 'query_billing',
  description: 'Query the BigQuery billing export for cost by service.',
  parameters: QueryBillingInput as any,
  execute: query_billing as any,
});
