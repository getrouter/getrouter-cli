import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { readJsonFile, writeJsonFile } from "../core/config/fs";
import { resolveConfigDir } from "../core/config/paths";
import {
  getCodexModelChoices,
  mapReasoningValue,
  REASONING_CHOICES,
  REASONING_FUZZY_CHOICES,
} from "../core/interactive/codex";
import { fuzzySelect } from "../core/interactive/fuzzy";
import { selectConsumer } from "../core/interactive/keys";
import {
  type CodexTomlRootValues,
  mergeAuthJson,
  mergeCodexToml,
  readCodexTomlRootValues,
  removeAuthJson,
  removeCodexConfig,
} from "../core/setup/codex";

const CODEX_DIR = ".codex";
const CODEX_BACKUP_FILE = "codex-backup.json";

type CodexBackupFile = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  config?: {
    previous?: CodexTomlRootValues;
    installed?: Required<CodexTomlRootValues>;
  };
  auth?: {
    previousOpenaiKey?: string;
    installedOpenaiKey?: string;
  };
};

const readFileIfExists = (filePath: string) =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

const readAuthJson = (filePath: string) => {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid auth.json format.");
  }
  return parsed as Record<string, unknown>;
};

const ensureCodexDir = () => {
  const dir = path.join(os.homedir(), CODEX_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const resolveCodexDir = () => path.join(os.homedir(), CODEX_DIR);
const resolveCodexBackupPath = () =>
  path.join(resolveConfigDir(), CODEX_BACKUP_FILE);

const readCodexBackup = (): CodexBackupFile | null => {
  const backupPath = resolveCodexBackupPath();
  const raw = readJsonFile<CodexBackupFile>(backupPath);
  if (!raw || typeof raw !== "object") return null;
  if ((raw as CodexBackupFile).version !== 1) return null;
  return raw;
};

const writeCodexBackup = (backup: CodexBackupFile) => {
  const backupPath = resolveCodexBackupPath();
  writeJsonFile(backupPath, backup);
  if (process.platform !== "win32") {
    fs.chmodSync(backupPath, 0o600);
  }
};

const requireInteractive = () => {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive mode required for codex configuration.");
  }
};

const promptModel = async () => {
  const choices = await getCodexModelChoices();
  return await fuzzySelect({
    message:
      "Select Model and Effort\nAccess legacy models by running getrouter codex -m <model_name> or in your config.toml",
    choices,
  });
};

const promptReasoning = async (model: string) =>
  await fuzzySelect({
    message: `Select Reasoning Level for ${model}`,
    choices: REASONING_FUZZY_CHOICES,
  });

const formatReasoningLabel = (id: string) =>
  REASONING_CHOICES.find((choice) => choice.id === id)?.label ?? id;

type CodexCommandOptions = {
  model?: string;
};

export function registerCodexCommand(program: Command): void {
  const codex = program.command("codex").description("Configure Codex");

  codex
    .option("-m, --model <model>", "Set codex model (skips model selection)")
    .action(async (options: CodexCommandOptions) => {
      requireInteractive();
      const model =
        options.model && options.model.trim().length > 0
          ? options.model.trim()
          : await promptModel();
      if (!model) return;
      const reasoningId = await promptReasoning(model);
      if (!reasoningId) return;
      const { consumerService } = createApiClients({});
      const selected = await selectConsumer(consumerService);
      if (!selected?.id) return;
      const consumer = await consumerService.GetConsumer({ id: selected.id });
      const apiKey = consumer?.apiKey ?? "";
      if (!apiKey) {
        throw new Error(
          "API key not found. Please create one or choose another.",
        );
      }

      const reasoningValue = mapReasoningValue(reasoningId);
      const keyName = selected.name?.trim() || "(unnamed)";

      console.log(`Model: ${model}`);
      console.log(
        `Reasoning: ${formatReasoningLabel(reasoningId)} (${reasoningValue})`,
      );
      console.log("Provider: getrouter");
      console.log(`Key: ${keyName}`);

      const codexDir = ensureCodexDir();
      const configPath = path.join(codexDir, "config.toml");
      const authPath = path.join(codexDir, "auth.json");

      const existingConfig = readFileIfExists(configPath);
      const existingRoot = readCodexTomlRootValues(existingConfig);

      const existingAuth = readAuthJson(authPath);
      const existingOpenaiKey =
        typeof existingAuth.OPENAI_API_KEY === "string"
          ? existingAuth.OPENAI_API_KEY
          : undefined;

      const now = new Date().toISOString();
      const installedRoot = {
        model: `"${model}"`,
        reasoning: `"${reasoningValue}"`,
        provider: `"getrouter"`,
      };

      const backup = readCodexBackup() ?? {
        version: 1 as const,
        createdAt: now,
        updatedAt: now,
      };
      backup.updatedAt = now;

      backup.config ??= {};
      backup.config.previous ??= {};
      const previousConfig = backup.config.previous;
      if (
        previousConfig.model === undefined &&
        existingRoot.model &&
        existingRoot.model !== installedRoot.model
      ) {
        previousConfig.model = existingRoot.model;
      }
      if (
        previousConfig.reasoning === undefined &&
        existingRoot.reasoning &&
        existingRoot.reasoning !== installedRoot.reasoning
      ) {
        previousConfig.reasoning = existingRoot.reasoning;
      }
      if (
        previousConfig.provider === undefined &&
        existingRoot.provider &&
        existingRoot.provider !== installedRoot.provider
      ) {
        previousConfig.provider = existingRoot.provider;
      }
      backup.config.installed = installedRoot;

      backup.auth ??= {};
      const authBackup = backup.auth;
      if (
        authBackup.previousOpenaiKey === undefined &&
        existingOpenaiKey &&
        existingOpenaiKey !== apiKey
      ) {
        authBackup.previousOpenaiKey = existingOpenaiKey;
      }
      authBackup.installedOpenaiKey = apiKey;
      writeCodexBackup(backup);

      const mergedConfig = mergeCodexToml(existingConfig, {
        model,
        reasoning: reasoningValue,
      });
      fs.writeFileSync(configPath, mergedConfig, "utf8");

      const mergedAuth = mergeAuthJson(existingAuth, apiKey);
      fs.writeFileSync(authPath, JSON.stringify(mergedAuth, null, 2));
      if (process.platform !== "win32") {
        fs.chmodSync(authPath, 0o600);
      }

      console.log("✅ Updated ~/.codex/config.toml");
      console.log("✅ Updated ~/.codex/auth.json");
    });

  codex
    .command("uninstall")
    .description("Remove getrouter Codex configuration")
    .action(() => {
      const codexDir = resolveCodexDir();
      const configPath = path.join(codexDir, "config.toml");
      const authPath = path.join(codexDir, "auth.json");

      const configExists = fs.existsSync(configPath);
      const authExists = fs.existsSync(authPath);

      const backup = readCodexBackup();
      const restoreRoot = backup?.config?.previous;
      const restoreOpenaiKey = backup?.auth?.previousOpenaiKey;
      const installedOpenaiKey = backup?.auth?.installedOpenaiKey;
      const hasBackup = Boolean(backup);

      const configContent = configExists ? readFileIfExists(configPath) : "";
      const configResult = configExists
        ? removeCodexConfig(configContent, {
            restoreRoot,
            allowRootRemoval: hasBackup,
          })
        : null;

      const authContent = authExists
        ? fs.readFileSync(authPath, "utf8").trim()
        : "";

      let authData: Record<string, unknown> | null = null;
      if (authExists) {
        if (authContent) {
          authData = JSON.parse(authContent) as Record<string, unknown>;
        } else {
          authData = {};
        }
      }

      const authResult = authData
        ? removeAuthJson(authData, {
            installed: installedOpenaiKey,
            restore: restoreOpenaiKey,
          })
        : null;

      if (!configExists) {
        console.log(`ℹ️ ${configPath} not found`);
      } else if (configResult?.changed) {
        fs.writeFileSync(configPath, configResult.content, "utf8");
        console.log(`✅ Removed getrouter entries from ${configPath}`);
      } else {
        console.log(`ℹ️ No getrouter entries in ${configPath}`);
      }

      if (!authExists) {
        console.log(`ℹ️ ${authPath} not found`);
      } else if (authResult?.changed) {
        fs.writeFileSync(authPath, JSON.stringify(authResult.data, null, 2));
        console.log(`✅ Removed getrouter entries from ${authPath}`);
      } else {
        console.log(`ℹ️ No getrouter entries in ${authPath}`);
      }

      const backupPath = resolveCodexBackupPath();
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    });
}
