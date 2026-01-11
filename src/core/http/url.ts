import { readConfig } from "../config";

export function getApiBase(): string {
  const raw = readConfig().apiBase || "";
  return raw.replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const base = getApiBase();
  const normalizedPath = path.replace(/^\/+/, "");

  if (base) {
    return `${base}/${normalizedPath}`;
  }

  return `/${normalizedPath}`;
}
