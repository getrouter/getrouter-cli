import fs from "node:fs";
import { readJsonFile, writeJsonFile } from "./fs";
import { getAuthPath, getConfigPath } from "./paths";
import {
  type AuthState,
  type ConfigFile,
  defaultAuthState,
  defaultConfig,
} from "./types";

export function readConfig(): ConfigFile {
  return {
    ...defaultConfig(),
    ...(readJsonFile<ConfigFile>(getConfigPath()) ?? {}),
  };
}

export function writeConfig(cfg: ConfigFile): void {
  writeJsonFile(getConfigPath(), cfg);
}

export function readAuth(): AuthState {
  return {
    ...defaultAuthState(),
    ...(readJsonFile<AuthState>(getAuthPath()) ?? {}),
  };
}

export function writeAuth(auth: AuthState): void {
  const authPath = getAuthPath();
  writeJsonFile(authPath, auth);
  if (process.platform !== "win32") {
    // Restrict token file permissions on Unix-like systems.
    fs.chmodSync(authPath, 0o600);
  }
}
