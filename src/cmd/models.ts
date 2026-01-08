import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { renderTable } from "../core/output/table";
import type { routercommonv1_Model } from "../generated/router/dashboard/v1";

const modelHeaders = ["ID", "NAME", "AUTHOR", "ENABLED", "UPDATED_AT"];

const modelRow = (model: routercommonv1_Model) => [
  String(model.id ?? ""),
  String(model.name ?? ""),
  String(model.author ?? ""),
  String(model.enabled ?? ""),
  String(model.updatedAt ?? ""),
];

const outputModels = (models: routercommonv1_Model[]) => {
  console.log("🧠 Models");
  console.log(renderTable(modelHeaders, models.map(modelRow)));
};

const listModels = async () => {
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
};

export const registerModelsCommands = (program: Command) => {
  const models = program.command("models").description("List models");

  models.action(async () => {
    await listModels();
  });

  models
    .command("list")
    .description("List models")
    .action(async () => {
      await listModels();
    });
};
