import { requestJson } from "../http/request";

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildProviderModelsPath = (tag?: string) => {
  const query = new URLSearchParams();
  if (tag) query.set("tag", tag);
  const qs = query.toString();
  return `v1/dashboard/providers/models${qs ? `?${qs}` : ""}`;
};

export const listProviderModels = async ({
  tag,
  fetchImpl,
}: {
  tag?: string;
  fetchImpl?: typeof fetch;
}): Promise<string[]> => {
  const res = await requestJson<{ models?: unknown }>({
    path: buildProviderModelsPath(tag),
    method: "GET",
    fetchImpl,
    maxRetries: 0,
  });
  const raw = res?.models;
  const models = Array.isArray(raw) ? raw : [];
  return models.map(asTrimmedString).filter(Boolean) as string[];
};
