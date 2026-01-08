import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { fetchAllPages } from "../core/api/pagination";
import { redactSecrets } from "../core/config/redact";
import {
  confirmDelete,
  promptKeyEnabled,
  promptKeyName,
  selectConsumerList,
  sortConsumersByUpdatedAtDesc,
} from "../core/interactive/keys";
import { renderTable } from "../core/output/table";
import type {
  ConsumerService,
  routercommonv1_Consumer,
} from "../generated/router/dashboard/v1";

type ConsumerLike = Partial<routercommonv1_Consumer>;

const consumerHeaders = [
  "NAME",
  "ENABLED",
  "LAST_ACCESS",
  "CREATED_AT",
  "API_KEY",
];

const consumerRow = (consumer: ConsumerLike, showApiKey: boolean) => {
  const { apiKey } = showApiKey
    ? consumer
    : (redactSecrets(consumer as Record<string, unknown>) as ConsumerLike);
  return [
    String(consumer.name ?? ""),
    String(consumer.enabled ?? ""),
    String(consumer.lastAccess ?? ""),
    String(consumer.createdAt ?? ""),
    String(apiKey ?? ""),
  ];
};

const outputConsumerTable = (consumer: ConsumerLike, showApiKey: boolean) => {
  console.log(
    renderTable(consumerHeaders, [consumerRow(consumer, showApiKey)], {
      maxColWidth: 64,
    }),
  );
};

const outputConsumers = (
  consumers: routercommonv1_Consumer[],
  showApiKey: boolean,
) => {
  const rows = consumers.map((consumer) => consumerRow(consumer, showApiKey));
  console.log(renderTable(consumerHeaders, rows, { maxColWidth: 64 }));
};

const requireInteractive = (message: string) => {
  if (!process.stdin.isTTY) {
    throw new Error(message);
  }
};

const requireInteractiveForSelection = () =>
  requireInteractive("Interactive mode required when key id is omitted.");

const requireInteractiveForAction = (action: string) =>
  requireInteractive(`Interactive mode required for keys ${action}.`);

const updateConsumer = async (
  consumerService: Pick<ConsumerService, "UpdateConsumer">,
  consumer: routercommonv1_Consumer,
  name: string | undefined,
  enabled: boolean | undefined,
) => {
  const updateMask = [
    name !== undefined && name !== consumer.name ? "name" : null,
    enabled !== undefined && enabled !== consumer.enabled ? "enabled" : null,
  ]
    .filter(Boolean)
    .join(",");
  if (!updateMask) {
    return consumer;
  }
  return consumerService.UpdateConsumer({
    consumer: {
      ...consumer,
      name: name ?? consumer.name,
      enabled: enabled ?? consumer.enabled,
    },
    updateMask,
  });
};

const listConsumers = async (
  consumerService: Pick<ConsumerService, "ListConsumers">,
  showApiKey: boolean,
) => {
  const consumers = await fetchAllPages(
    (pageToken) =>
      consumerService.ListConsumers({
        pageSize: undefined,
        pageToken,
      }),
    (res) => res?.consumers ?? [],
    (res) => res?.nextPageToken || undefined,
  );
  const sorted = sortConsumersByUpdatedAtDesc(consumers);
  outputConsumers(sorted, showApiKey);
};

const resolveConsumerForUpdate = async (
  consumerService: Pick<ConsumerService, "GetConsumer" | "ListConsumers">,
  id?: string,
) => {
  if (id) {
    return consumerService.GetConsumer({ id });
  }
  requireInteractiveForSelection();
  return await selectConsumerList(consumerService, "Select key to update");
};

const resolveConsumerForDelete = async (
  consumerService: Pick<ConsumerService, "GetConsumer" | "ListConsumers">,
  id?: string,
) => {
  if (id) {
    return consumerService.GetConsumer({ id });
  }
  requireInteractiveForSelection();
  return await selectConsumerList(consumerService, "Select key to delete");
};

const createConsumer = async (
  consumerService: Pick<ConsumerService, "CreateConsumer" | "UpdateConsumer">,
) => {
  requireInteractiveForAction("create");
  const nameResult = await promptKeyName();
  if (nameResult.cancelled) return;
  const enabledResult = await promptKeyEnabled(true);
  if (enabledResult.cancelled) return;
  let consumer = await consumerService.CreateConsumer({});
  consumer = await updateConsumer(
    consumerService,
    consumer,
    nameResult.name,
    enabledResult.enabled,
  );
  outputConsumerTable(consumer, true);
  console.log("Please store this API key securely.");
};

const updateConsumerById = async (
  consumerService: Pick<
    ConsumerService,
    "GetConsumer" | "ListConsumers" | "UpdateConsumer"
  >,
  id?: string,
) => {
  requireInteractiveForAction("update");
  const selected = await resolveConsumerForUpdate(consumerService, id);
  if (!selected?.id) return;
  const nameResult = await promptKeyName(selected.name);
  if (nameResult.cancelled) return;
  const enabledResult = await promptKeyEnabled(selected.enabled ?? true);
  if (enabledResult.cancelled) return;
  const consumer = await updateConsumer(
    consumerService,
    selected,
    nameResult.name,
    enabledResult.enabled,
  );
  outputConsumerTable(consumer, false);
};

const deleteConsumerById = async (
  consumerService: Pick<
    ConsumerService,
    "GetConsumer" | "ListConsumers" | "DeleteConsumer"
  >,
  id?: string,
) => {
  requireInteractiveForAction("delete");
  const selected = await resolveConsumerForDelete(consumerService, id);
  if (!selected?.id) return;
  const confirmed = await confirmDelete(selected);
  if (!confirmed) return;
  await consumerService.DeleteConsumer({ id: selected.id });
  outputConsumerTable(selected, false);
};

export const registerKeysCommands = (program: Command) => {
  const keys = program.command("keys").description("Manage API keys");
  keys.option("--show", "Show full API keys");
  keys.allowExcessArguments(false);

  keys.action(async (options: { show?: boolean }) => {
    const { consumerService } = createApiClients({});
    await listConsumers(consumerService, Boolean(options.show));
  });

  keys
    .command("list")
    .description("List API keys")
    .option("--show", "Show full API keys")
    .action(async (options: { show?: boolean }, command: Command) => {
      const { consumerService } = createApiClients({});
      const parentShow = Boolean(command.parent?.opts().show);
      await listConsumers(consumerService, Boolean(options.show) || parentShow);
    });

  keys
    .command("create")
    .description("Create an API key")
    .action(async () => {
      const { consumerService } = createApiClients({});
      await createConsumer(consumerService);
    });

  keys
    .command("update")
    .description("Update an API key")
    .argument("[id]", "Key id")
    .action(async (id?: string) => {
      const { consumerService } = createApiClients({});
      await updateConsumerById(consumerService, id);
    });

  keys
    .command("delete")
    .description("Delete an API key")
    .argument("[id]", "Key id")
    .action(async (id?: string) => {
      const { consumerService } = createApiClients({});
      await deleteConsumerById(consumerService, id);
    });
};
