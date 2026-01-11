import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { renderTable } from "../core/output/table";
import type { routercommonv1_Model } from "../generated/router/dashboard/v1";

const modelHeaders = ["ID", "NAME", "AUTHOR", "ENABLED", "UPDATED_AT"];

function formatModelRow(model: routercommonv1_Model): string[] {
  return [
    String(model.id ?? ""),
    String(model.name ?? ""),
    String(model.author ?? ""),
    String(model.enabled ?? ""),
    String(model.updatedAt ?? ""),
  ];
}

function outputModels(models: routercommonv1_Model[]): void {
  console.log("🧠 Models");
  console.log(renderTable(modelHeaders, models.map(formatModelRow)));
}

async function listModels(): Promise<void> {
  const { modelService } = createApiClients({});
  const res = await modelService.ListModels({
    pageSize: undefined,
    pageToken: undefined,
    filter: undefined,
  });
  const models = res?.models ?? [];

  if (models.length === 0) {
    console.log("😕 No models found");
    return;
  }

  outputModels(models);
}

export function registerModelsCommands(program: Command): void {
  const models = program
    .command("models")
    .description("List models")
    .action(listModels);

  models.command("list").description("List models").action(listModels);
}
