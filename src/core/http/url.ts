import { readConfig } from "../config";

export const getApiBase = () => {
  const raw = readConfig().apiBase || "";
  return raw.replace(/\/+$/, "");
};

export const buildApiUrl = (path: string) => {
  const base = getApiBase();
  const normalized = path.replace(/^\/+/, "");
  return base ? `${base}/${normalized}` : `/${normalized}`;
};
