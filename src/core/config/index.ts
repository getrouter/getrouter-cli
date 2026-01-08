import fs from "node:fs";
import { readJsonFile, writeJsonFile } from "./fs";
import { getAuthPath, getConfigPath } from "./paths";
import {
  type AuthState,
  type ConfigFile,
  defaultAuthState,
  defaultConfig,
} from "./types";

export const readConfig = (): ConfigFile => ({
  ...defaultConfig(),
  ...(readJsonFile<ConfigFile>(getConfigPath()) ?? {}),
});

export const writeConfig = (cfg: ConfigFile) =>
  writeJsonFile(getConfigPath(), cfg);

export const readAuth = (): AuthState => ({
  ...defaultAuthState(),
  ...(readJsonFile<AuthState>(getAuthPath()) ?? {}),
});

export const writeAuth = (auth: AuthState) => {
  const authPath = getAuthPath();
  writeJsonFile(authPath, auth);
  if (process.platform !== "win32") {
    // Restrict token file permissions on Unix-like systems.
    fs.chmodSync(authPath, 0o600);
  }
};
