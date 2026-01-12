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

type PromptKeyResult =
  | { cancelled: true }
  | { cancelled: false; name: string | undefined; enabled: boolean };

const promptKeyDetails = async (
  initialName: string | undefined,
  initialEnabled: boolean,
): Promise<PromptKeyResult> => {
  const nameResult = await promptKeyName(initialName);
  if (nameResult.cancelled) return { cancelled: true };

  const enabledResult = await promptKeyEnabled(initialEnabled);
  if (enabledResult.cancelled) return { cancelled: true };

  return {
    cancelled: false,
    name: nameResult.name,
    enabled: enabledResult.enabled,
  };
};

const updateConsumer = async (
  consumerService: Pick<ConsumerService, "UpdateConsumer">,
  consumer: routercommonv1_Consumer,
  name: string | undefined,
  enabled: boolean | undefined,
) => {
  const updateMaskParts: string[] = [];
  if (name !== undefined && name !== consumer.name) {
    updateMaskParts.push("name");
  }
  if (enabled !== undefined && enabled !== consumer.enabled) {
    updateMaskParts.push("enabled");
  }
  const updateMask = updateMaskParts.join(",");
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

const resolveConsumer = async (
  consumerService: Pick<ConsumerService, "GetConsumer" | "ListConsumers">,
  message: string,
  id?: string,
) => {
  if (id) {
    return consumerService.GetConsumer({ id });
  }
  requireInteractiveForSelection();
  return await selectConsumerList(consumerService, message);
};

const createConsumer = async (
  consumerService: Pick<ConsumerService, "CreateConsumer" | "UpdateConsumer">,
) => {
  requireInteractiveForAction("create");

  const details = await promptKeyDetails(undefined, true);
  if (details.cancelled) return;

  let consumer = await consumerService.CreateConsumer({});
  consumer = await updateConsumer(
    consumerService,
    consumer,
    details.name,
    details.enabled,
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
  const selected = await resolveConsumer(
    consumerService,
    "Select key to update",
    id,
  );
  if (!selected?.id) return;

  const details = await promptKeyDetails(
    selected.name,
    selected.enabled ?? true,
  );
  if (details.cancelled) return;

  const consumer = await updateConsumer(
    consumerService,
    selected,
    details.name,
    details.enabled,
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
  const selected = await resolveConsumer(
    consumerService,
    "Select key to delete",
    id,
  );
  if (!selected?.id) return;
  const confirmed = await confirmDelete(selected);
  if (!confirmed) return;
  await consumerService.DeleteConsumer({ id: selected.id });
  outputConsumerTable(selected, false);
};

export function registerKeysCommands(program: Command): void {
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
}
