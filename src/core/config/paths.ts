import os from "node:os";
import path from "node:path";

export const resolveConfigDir = () =>
  process.env.GETROUTER_CONFIG_DIR || path.join(os.homedir(), ".getrouter");

export const getConfigPath = () => path.join(resolveConfigDir(), "config.json");
export const getAuthPath = () => path.join(resolveConfigDir(), "auth.json");
