import { requestJson } from "../http/request";

type ListProviderModelsOptions = {
  tag?: string;
  fetchImpl?: typeof fetch;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildProviderModelsPath(tag?: string): string {
  const query = new URLSearchParams();
  if (tag) query.set("tag", tag);
  const qs = query.toString();
  return `v1/dashboard/providers/models${qs ? `?${qs}` : ""}`;
}

export async function listProviderModels(
  options: ListProviderModelsOptions,
): Promise<string[]> {
  const res = await requestJson<{ models?: unknown }>({
    path: buildProviderModelsPath(options.tag),
    method: "GET",
    fetchImpl: options.fetchImpl,
    maxRetries: 0,
  });
  const raw = res?.models;
  const models = Array.isArray(raw) ? raw : [];
  return models.map(asTrimmedString).filter(Boolean) as string[];
}
