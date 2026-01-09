import prompts from "prompts";
import type {
  ConsumerService as DashboardConsumerService,
  routercommonv1_Consumer,
} from "../../generated/router/dashboard/v1";
import { fetchAllPages } from "../api/pagination";
import { fuzzySelect } from "./fuzzy";

type Consumer = routercommonv1_Consumer;
type ConsumerService = Pick<DashboardConsumerService, "ListConsumers">;

export type KeyMenuAction =
  | "list"
  | "view"
  | "create"
  | "update"
  | "delete"
  | "exit";

const parseTimestamp = (value?: string) => {
  const parsed = Date.parse(value ?? "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getUpdatedAtTime = (consumer: Consumer) => {
  const updatedAt = parseTimestamp(consumer.updatedAt);
  if (updatedAt) return updatedAt;
  return parseTimestamp(consumer.createdAt);
};

const getDisplayTimestamp = (consumer: Consumer) =>
  consumer.updatedAt ?? consumer.createdAt ?? "-";

export const sortConsumersByUpdatedAtDesc = (consumers: Consumer[]) =>
  consumers.slice().sort((a, b) => {
    const aTime = getUpdatedAtTime(a);
    const bTime = getUpdatedAtTime(b);
    return bTime - aTime;
  });

const normalizeName = (consumer: Consumer) => {
  const name = consumer.name?.trim();
  return name && name.length > 0 ? name : "(unnamed)";
};

const buildNameCounts = (consumers: Consumer[]) => {
  const counts = new Map<string, number>();
  for (const consumer of consumers) {
    const name = normalizeName(consumer);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
};

const formatChoice = (consumer: Consumer, nameCounts: Map<string, number>) => {
  const name = normalizeName(consumer);
  const displayTimestamp = getDisplayTimestamp(consumer);
  const needsDetail = (nameCounts.get(name) ?? 0) > 1 || name === "(unnamed)";
  return needsDetail ? `${name} (${displayTimestamp})` : name;
};

export const selectKeyAction = async (): Promise<KeyMenuAction> => {
  const actions: KeyMenuAction[] = [
    "list",
    "view",
    "create",
    "update",
    "delete",
    "exit",
  ];
  const response = await prompts({
    type: "select",
    name: "action",
    message: "🔑 Select an action",
    choices: [
      { title: "List keys", value: "list" },
      { title: "View key", value: "view" },
      { title: "Create key", value: "create" },
      { title: "Update key", value: "update" },
      { title: "Delete key", value: "delete" },
      { title: "Exit", value: "exit" },
    ],
  });
  if (typeof response.action === "number") {
    return actions[response.action] ?? "exit";
  }
  if (typeof response.action === "string") {
    return response.action as KeyMenuAction;
  }
  return "exit";
};

export const promptKeyName = async (
  initial?: string,
): Promise<
  { cancelled: true } | { cancelled: false; name: string | undefined }
> => {
  const response = await prompts({
    type: "text",
    name: "name",
    message: "Key name",
    initial: initial ?? "",
  });
  if (!("name" in response)) {
    return { cancelled: true };
  }
  const value = typeof response.name === "string" ? response.name.trim() : "";
  return { cancelled: false, name: value.length > 0 ? value : undefined };
};

export const promptKeyEnabled = async (
  initial: boolean,
): Promise<{ cancelled: true } | { cancelled: false; enabled: boolean }> => {
  const response = await prompts({
    type: "confirm",
    name: "enabled",
    message: "Enable this key?",
    initial,
  });
  if (!("enabled" in response)) {
    return { cancelled: true };
  }
  return {
    cancelled: false,
    enabled: typeof response.enabled === "boolean" ? response.enabled : initial,
  };
};

export const selectConsumer = async (
  consumerService: ConsumerService,
): Promise<routercommonv1_Consumer | null> => {
  const consumers = await fetchAllPages(
    (pageToken) =>
      consumerService.ListConsumers({
        pageSize: undefined,
        pageToken,
      }),
    (res) => res?.consumers ?? [],
    (res) => res?.nextPageToken || undefined,
  );
  if (consumers.length === 0) {
    console.log(
      "No available API keys. Create one at https://getrouter.dev/dashboard/keys",
    );
    return null;
  }
  const sorted = sortConsumersByUpdatedAtDesc(consumers);
  const nameCounts = buildNameCounts(sorted);
  const selected = await fuzzySelect({
    message: "🔎 Search keys",
    choices: sorted.map((consumer) => ({
      title: formatChoice(consumer, nameCounts),
      value: consumer,
      keywords: [
        normalizeName(consumer),
        consumer.updatedAt ?? "",
        consumer.createdAt ?? "",
      ].filter(Boolean),
    })),
  });
  return selected ?? null;
};

export const selectConsumerList = async (
  consumerService: ConsumerService,
  message: string,
): Promise<routercommonv1_Consumer | null> => {
  const consumers = await fetchAllPages(
    (pageToken) =>
      consumerService.ListConsumers({
        pageSize: undefined,
        pageToken,
      }),
    (res) => res?.consumers ?? [],
    (res) => res?.nextPageToken || undefined,
  );
  if (consumers.length === 0) {
    console.log(
      "No available API keys. Create one at https://getrouter.dev/dashboard/keys",
    );
    return null;
  }
  const sorted = sortConsumersByUpdatedAtDesc(consumers);
  const nameCounts = buildNameCounts(sorted);
  const response = await prompts({
    type: "select",
    name: "value",
    message,
    choices: sorted.map((consumer) => ({
      title: formatChoice(consumer, nameCounts),
      value: consumer,
    })),
  });
  if (response.value == null || response.value === "") return null;
  return response.value as routercommonv1_Consumer;
};

export const confirmDelete = async (consumer: Consumer) => {
  const name = consumer.name ?? "-";
  const id = consumer.id ?? "-";
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: `⚠️ Confirm delete ${name} (${id})?`,
    initial: false,
  });
  return Boolean(response.confirm);
};
