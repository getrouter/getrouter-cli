import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { renderUsageChart } from "../core/output/usages";
import { aggregateUsages, type RawUsage } from "../core/usages/aggregate";

type UsageListResponse = {
  usages?: RawUsage[];
  nextPageToken?: string;
};

async function collectUsages(): Promise<ReturnType<typeof aggregateUsages>> {
  const { usageService } = createApiClients({});
  const res = (await usageService.ListUsage({
    pageSize: 7,
    pageToken: undefined,
  })) as UsageListResponse;
  const usages = res?.usages ?? [];
  return aggregateUsages(usages, 7);
}

export function registerUsagesCommand(program: Command): void {
  program
    .command("usages")
    .description("Show recent usage")
    .action(async () => {
      const aggregated = await collectUsages();
      console.log(renderUsageChart(aggregated));
    });
}
