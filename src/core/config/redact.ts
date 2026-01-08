const SECRET_KEYS = new Set(["accessToken", "refreshToken", "apiKey"]);

const mask = (value: string) => {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export const redactSecrets = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (SECRET_KEYS.has(key) && typeof value === "string") {
      out[key] = mask(value);
    }
  }
  return out as T;
};
