import os from "node:os";
import path from "node:path";

export function resolveConfigDir(): string {
  return (
    process.env.GETROUTER_CONFIG_DIR || path.join(os.homedir(), ".getrouter")
  );
}

export function getConfigPath(): string {
  return path.join(resolveConfigDir(), "config.json");
}

export function getAuthPath(): string {
  return path.join(resolveConfigDir(), "auth.json");
}
