import os from "node:os";
import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { resolveConfigDir } from "../core/config/paths";
import { selectConsumer } from "../core/interactive/keys";
import {
  appendRcIfMissing,
  applyEnvVars,
  detectShell,
  type EnvVars,
  formatSourceLine,
  getEnvFilePath,
  getHookFilePath,
  renderEnv,
  renderHook,
  resolveEnvShell,
  resolveShellRcPath,
  trySourceEnv,
  writeEnvFile,
} from "../core/setup/env";

const CODEX_BASE_URL = "https://api.getrouter.dev/codex";
const CLAUDE_BASE_URL = "https://api.getrouter.dev/claude";

type EnvCommandOptions = {
  install?: boolean;
};

type EnvCommandConfig = {
  name: string;
  description: string;
  vars: (apiKey: string) => EnvVars;
};

export function registerEnvCommand(
  program: Command,
  config: EnvCommandConfig,
): void {
  program
    .command(config.name)
    .description(config.description)
    .option("--install", "Install into shell rc")
    .action(async (options: EnvCommandOptions) => {
      if (!process.stdin.isTTY) {
        throw new Error("Interactive mode required for key selection.");
      }
      const shell = detectShell();
      const envShell = resolveEnvShell(shell);
      const configDir = resolveConfigDir();
      const { consumerService } = createApiClients({});
      const selected = await selectConsumer(consumerService);
      if (!selected?.id) return;
      const consumer = await consumerService.GetConsumer({ id: selected.id });
      if (!consumer?.apiKey) {
        throw new Error(
          "API key not found. Please create one or choose another.",
        );
      }

      const vars = config.vars(consumer.apiKey);
      const envPath = getEnvFilePath(envShell, configDir);
      writeEnvFile(envPath, renderEnv(envShell, vars));

      let installed = false;
      let rcPath: string | null = null;
      if (options.install) {
        const hookPath = getHookFilePath(shell, configDir);
        writeEnvFile(hookPath, renderHook(shell));
        rcPath = resolveShellRcPath(shell, os.homedir());
        if (rcPath) {
          const envLine = formatSourceLine(envShell, envPath);
          const hookLine = formatSourceLine(envShell, hookPath);
          const envAdded = appendRcIfMissing(rcPath, envLine);
          const hookAdded = appendRcIfMissing(rcPath, hookLine);
          installed = envAdded || hookAdded;
        }
        applyEnvVars(vars);
        trySourceEnv(shell, envShell, envPath);
      }

      const sourceLine = formatSourceLine(envShell, envPath);
      if (options.install) {
        if (installed && rcPath) {
          console.log(`✅ Added to ${rcPath}`);
        } else if (rcPath) {
          console.log(`ℹ️ Already configured in ${rcPath}`);
        }
      } else {
        console.log("To load the environment in your shell, run:");
        console.log(sourceLine);
      }
    });
}

export function buildOpenAIEnv(apiKey: string): EnvVars {
  return {
    openaiBaseUrl: CODEX_BASE_URL,
    openaiApiKey: apiKey,
  };
}

export function buildAnthropicEnv(apiKey: string): EnvVars {
  return {
    anthropicBaseUrl: CLAUDE_BASE_URL,
    anthropicApiKey: apiKey,
  };
}
