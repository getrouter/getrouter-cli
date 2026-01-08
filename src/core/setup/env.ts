import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type EnvVars = {
  openaiBaseUrl?: string;
  openaiApiKey?: string;
  anthropicBaseUrl?: string;
  anthropicApiKey?: string;
};

export type EnvShell = "sh" | "ps1";

export type RcShell = "zsh" | "bash" | "fish" | "pwsh";

const quoteEnvValue = (shell: EnvShell, value: string) => {
  if (shell === "ps1") {
    // PowerShell: single quotes are literal; escape by doubling.
    return `'${value.replaceAll("'", "''")}'`;
  }

  // POSIX shell: use single quotes; escape embedded single quotes with: '\''.
  return `'${value.replaceAll("'", "'\\''")}'`;
};

const renderLine = (shell: EnvShell, key: string, value: string) => {
  if (shell === "ps1") {
    return `$env:${key}=${quoteEnvValue(shell, value)}`;
  }
  return `export ${key}=${quoteEnvValue(shell, value)}`;
};

export const renderEnv = (shell: EnvShell, vars: EnvVars) => {
  const lines: string[] = [];
  if (vars.openaiBaseUrl) {
    lines.push(renderLine(shell, "OPENAI_BASE_URL", vars.openaiBaseUrl));
  }
  if (vars.openaiApiKey) {
    lines.push(renderLine(shell, "OPENAI_API_KEY", vars.openaiApiKey));
  }
  if (vars.anthropicBaseUrl) {
    lines.push(renderLine(shell, "ANTHROPIC_BASE_URL", vars.anthropicBaseUrl));
  }
  if (vars.anthropicApiKey) {
    lines.push(renderLine(shell, "ANTHROPIC_API_KEY", vars.anthropicApiKey));
  }
  lines.push("");
  return lines.join("\n");
};

// Wrap getrouter to source env after successful codex/claude runs.
export const renderHook = (shell: RcShell) => {
  if (shell === "pwsh") {
    return [
      "function getrouter {",
      "  $cmd = Get-Command getrouter -CommandType Application,ExternalScript -ErrorAction SilentlyContinue | Select-Object -First 1",
      "  if ($null -ne $cmd) {",
      "    & $cmd.Source @args",
      "  }",
      "  $exitCode = $LASTEXITCODE",
      "  if ($exitCode -ne 0) {",
      "    return $exitCode",
      "  }",
      '  if ($args.Count -gt 0 -and ($args[0] -eq "codex" -or $args[0] -eq "claude")) {',
      '    $configDir = if ($env:GETROUTER_CONFIG_DIR) { $env:GETROUTER_CONFIG_DIR } else { Join-Path $HOME ".getrouter" }',
      '    $envPath = Join-Path $configDir "env.ps1"',
      "    if (Test-Path $envPath) {",
      "      . $envPath",
      "    }",
      "  }",
      "  return $exitCode",
      "}",
      "",
    ].join("\n");
  }

  if (shell === "fish") {
    return [
      "function getrouter",
      "  command getrouter $argv",
      "  set -l exit_code $status",
      "  if test $exit_code -ne 0",
      "    return $exit_code",
      "  end",
      "  if test (count $argv) -gt 0",
      "    switch $argv[1]",
      "      case codex claude",
      "        set -l config_dir $GETROUTER_CONFIG_DIR",
      '        if test -z "$config_dir"',
      '          set config_dir "$HOME/.getrouter"',
      "        end",
      '        set -l env_path "$config_dir/env.sh"',
      '        if test -f "$env_path"',
      '          source "$env_path"',
      "        end",
      "    end",
      "  end",
      "  return $exit_code",
      "end",
      "",
    ].join("\n");
  }

  return [
    "getrouter() {",
    '  command getrouter "$@"',
    "  local exit_code=$?",
    "  if [ $exit_code -ne 0 ]; then",
    "    return $exit_code",
    "  fi",
    '  case "$1" in',
    "    codex|claude)",
    `      local config_dir="\${GETROUTER_CONFIG_DIR:-$HOME/.getrouter}"`,
    '      local env_path="$config_dir/env.sh"',
    '      if [ -f "$env_path" ]; then',
    '        source "$env_path"',
    "      fi",
    "      ;;",
    "  esac",
    "  return $exit_code",
    "}",
    "",
  ].join("\n");
};

export const getEnvFilePath = (shell: EnvShell, configDir: string) =>
  path.join(configDir, shell === "ps1" ? "env.ps1" : "env.sh");

export const getHookFilePath = (shell: RcShell, configDir: string) => {
  if (shell === "pwsh") return path.join(configDir, "hook.ps1");
  if (shell === "fish") return path.join(configDir, "hook.fish");
  return path.join(configDir, "hook.sh");
};

export const writeEnvFile = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  if (process.platform !== "win32") {
    // Limit env file readability since it can contain API keys.
    fs.chmodSync(filePath, 0o600);
  }
};

export const resolveShellRcPath = (shell: RcShell, homeDir: string) => {
  if (shell === "zsh") return path.join(homeDir, ".zshrc");
  if (shell === "bash") return path.join(homeDir, ".bashrc");
  if (shell === "fish") return path.join(homeDir, ".config/fish/config.fish");
  if (shell === "pwsh") {
    if (process.platform === "win32") {
      return path.join(
        homeDir,
        "Documents/PowerShell/Microsoft.PowerShell_profile.ps1",
      );
    }
    return path.join(
      homeDir,
      ".config/powershell/Microsoft.PowerShell_profile.ps1",
    );
  }
  return null;
};

export const resolveEnvShell = (shell: RcShell): EnvShell =>
  shell === "pwsh" ? "ps1" : "sh";

export const detectShell = (): RcShell => {
  const shellPath = process.env.SHELL;
  if (shellPath) {
    const name = shellPath.split("/").pop()?.toLowerCase();
    if (
      name === "zsh" ||
      name === "bash" ||
      name === "fish" ||
      name === "pwsh"
    ) {
      return name;
    }
  }
  if (process.platform === "win32") return "pwsh";
  return "bash";
};

export const applyEnvVars = (vars: EnvVars) => {
  if (vars.openaiBaseUrl) process.env.OPENAI_BASE_URL = vars.openaiBaseUrl;
  if (vars.openaiApiKey) process.env.OPENAI_API_KEY = vars.openaiApiKey;
  if (vars.anthropicBaseUrl) {
    process.env.ANTHROPIC_BASE_URL = vars.anthropicBaseUrl;
  }
  if (vars.anthropicApiKey) {
    process.env.ANTHROPIC_API_KEY = vars.anthropicApiKey;
  }
};

export const formatSourceLine = (shell: EnvShell, envPath: string) =>
  shell === "ps1" ? `. ${envPath}` : `source ${envPath}`;

export const trySourceEnv = (
  shell: RcShell,
  envShell: EnvShell,
  envPath: string,
) => {
  try {
    if (envShell === "ps1") {
      execSync(`pwsh -NoProfile -Command ". '${envPath}'"`, {
        stdio: "ignore",
      });
      return;
    }
    const command = shell === "fish" ? "source" : "source";
    execSync(`${shell} -c "${command} '${envPath}'"`, {
      stdio: "ignore",
    });
  } catch {
    // Best-effort: ignore failures and let the caller print instructions.
  }
};

export const appendRcIfMissing = (rcPath: string, line: string) => {
  let content = "";
  if (fs.existsSync(rcPath)) {
    content = fs.readFileSync(rcPath, "utf8");
    if (content.includes(line)) return false;
  }
  const prefix = content && !content.endsWith("\n") ? "\n" : "";
  fs.mkdirSync(path.dirname(rcPath), { recursive: true });
  fs.writeFileSync(rcPath, `${content}${prefix}${line}\n`, "utf8");
  return true;
};
