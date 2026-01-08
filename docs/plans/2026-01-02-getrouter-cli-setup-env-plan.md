# Setup Env Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `getrouter setup env` to generate environment variable configuration (OpenAI/Anthropic) with optional print/install behavior.

**Architecture:** Introduce a small `core/setup/env` helper to render env content, write env files, and manage shell rc installation. Wire a new `setup env` command that selects an API key (explicit `--key` or interactive), fetches key details, and writes/prints env configuration.

**Tech Stack:** TypeScript, Commander, Vitest, Node `fs/path/os`.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing tests for setup env

**Files:**
- Create: `tests/cmd/setup.test.ts`
- Create: `tests/core/setup/env.test.ts`

**Step 1: Write failing core helper tests**

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  renderEnv,
  writeEnvFile,
  getEnvFilePath,
  resolveShellRcPath,
  appendRcIfMissing,
} from "../../src/core/setup/env";

const vars = {
  openaiBaseUrl: "https://api.getrouter.dev/v1",
  openaiApiKey: "key-123",
  anthropicBaseUrl: "https://api.getrouter.dev/v1",
  anthropicApiKey: "key-123",
};

describe("setup env helpers", () => {
  it("renders sh env", () => {
    const output = renderEnv("sh", vars);
    expect(output).toContain("export OPENAI_BASE_URL=https://api.getrouter.dev/v1");
    expect(output).toContain("export ANTHROPIC_API_KEY=key-123");
  });

  it("renders ps1 env", () => {
    const output = renderEnv("ps1", vars);
    expect(output).toContain('$env:OPENAI_BASE_URL="https://api.getrouter.dev/v1"');
    expect(output).toContain('$env:ANTHROPIC_API_KEY="key-123"');
  });

  it("writes env file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-env-"));
    const filePath = getEnvFilePath("sh", dir);
    writeEnvFile(filePath, "hello");
    expect(fs.readFileSync(filePath, "utf8")).toBe("hello");
  });

  it("resolves shell rc paths", () => {
    expect(resolveShellRcPath("zsh", "/tmp")).toBe("/tmp/.zshrc");
    expect(resolveShellRcPath("bash", "/tmp")).toBe("/tmp/.bashrc");
    expect(resolveShellRcPath("fish", "/tmp")).toBe(
      "/tmp/.config/fish/config.fish"
    );
  });

  it("appends rc line once", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-rc-"));
    const rcPath = path.join(dir, "rc");
    const line = "source ~/.getrouter/env.sh";
    fs.writeFileSync(rcPath, line + "\n");
    expect(appendRcIfMissing(rcPath, line)).toBe(false);
    expect(appendRcIfMissing(rcPath, line)).toBe(false);
    const content = fs.readFileSync(rcPath, "utf8");
    expect(content.split(line).length - 1).toBe(1);
  });
});
```

**Step 2: Write failing command tests**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import { getEnvFilePath } from "../../src/core/setup/env";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
const mockConsumer = { id: "c1", apiKey: "key-123" };

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", {
    value,
    configurable: true,
  });
};

afterEach(() => {
  setStdinTTY(originalIsTTY);
});

describe("setup env", () => {
  it("prints env content when --print is set", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: { GetConsumer: vi.fn().mockResolvedValue(mockConsumer) },
      subscriptionService: {} as any,
      authService: {} as any,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync([
      "node",
      "getrouter",
      "setup",
      "env",
      "--key",
      "c1",
      "--print",
      "--shell",
      "bash",
    ]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("OPENAI_BASE_URL");
    expect(fs.existsSync(getEnvFilePath("sh", dir))).toBe(false);
    log.mockRestore();
  });

  it("writes env file by default", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: { GetConsumer: vi.fn().mockResolvedValue(mockConsumer) },
      subscriptionService: {} as any,
      authService: {} as any,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync([
      "node",
      "getrouter",
      "setup",
      "env",
      "--key",
      "c1",
      "--shell",
      "bash",
    ]);
    const content = fs.readFileSync(getEnvFilePath("sh", dir), "utf8");
    expect(content).toContain("OPENAI_BASE_URL");
    log.mockRestore();
  });

  it("fails when no key in non-tty", async () => {
    setStdinTTY(false);
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "getrouter", "setup", "env"])
    ).rejects.toThrow("缺少 key id");
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- tests/cmd/setup.test.ts tests/core/setup/env.test.ts`
Expected: FAIL (module/command missing).

**Step 4: Commit failing tests**

```bash
git add tests/cmd/setup.test.ts tests/core/setup/env.test.ts
git commit -m "test: cover setup env"
```

### Task 2: Implement setup env helpers

**Files:**
- Create: `src/core/setup/env.ts`

**Step 1: Implement helper module**

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

type EnvVars = {
  openaiBaseUrl: string;
  openaiApiKey: string;
  anthropicBaseUrl: string;
  anthropicApiKey: string;
};

type EnvShell = "sh" | "ps1";

type RcShell = "zsh" | "bash" | "fish" | "pwsh";

export const renderEnv = (shell: EnvShell, vars: EnvVars) => {
  if (shell === "ps1") {
    return [
      `$env:OPENAI_BASE_URL=\"${vars.openaiBaseUrl}\"`,
      `$env:OPENAI_API_KEY=\"${vars.openaiApiKey}\"`,
      `$env:ANTHROPIC_BASE_URL=\"${vars.anthropicBaseUrl}\"`,
      `$env:ANTHROPIC_API_KEY=\"${vars.anthropicApiKey}\"`,
      "",
    ].join("\n");
  }
  return [
    `export OPENAI_BASE_URL=${vars.openaiBaseUrl}`,
    `export OPENAI_API_KEY=${vars.openaiApiKey}`,
    `export ANTHROPIC_BASE_URL=${vars.anthropicBaseUrl}`,
    `export ANTHROPIC_API_KEY=${vars.anthropicApiKey}`,
    "",
  ].join("\n");
};

export const getEnvFilePath = (shell: EnvShell, configDir: string) =>
  path.join(configDir, shell === "ps1" ? "env.ps1" : "env.sh");

export const writeEnvFile = (filePath: string, content: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  if (process.platform !== "win32") {
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
        "Documents/PowerShell/Microsoft.PowerShell_profile.ps1"
      );
    }
    return path.join(homeDir, ".config/powershell/Microsoft.PowerShell_profile.ps1");
  }
  return null;
};

export const appendRcIfMissing = (rcPath: string, line: string) => {
  let content = "";
  if (fs.existsSync(rcPath)) {
    content = fs.readFileSync(rcPath, "utf8");
    if (content.includes(line)) return false;
  }
  const prefix = content && !content.endsWith("\n") ? "\n" : "";
  fs.mkdirSync(path.dirname(rcPath), { recursive: true });
  fs.writeFileSync(rcPath, content + prefix + line + "\n", "utf8");
  return true;
};

export const resolveConfigDir = () =>
  process.env.GETROUTER_CONFIG_DIR || path.join(os.homedir(), ".getrouter");
```

**Step 2: Run helper tests to verify pass**

Run: `npm test -- tests/core/setup/env.test.ts`
Expected: PASS

**Step 3: Commit helper implementation**

```bash
git add src/core/setup/env.ts tests/core/setup/env.test.ts
git commit -m "feat: add setup env helpers"
```

### Task 3: Wire setup env command

**Files:**
- Create: `src/cmd/setup.ts`
- Modify: `src/cmd/index.ts`
- Modify: `tests/cmd/setup.test.ts`

**Step 1: Implement setup env command**

```ts
import { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { selectConsumer } from "../core/interactive/keys";
import {
  renderEnv,
  getEnvFilePath,
  writeEnvFile,
  resolveShellRcPath,
  appendRcIfMissing,
  resolveConfigDir,
} from "../core/setup/env";

const BASE_URL = "https://api.getrouter.dev/v1";

type SetupEnvOptions = {
  key?: string;
  print?: boolean;
  install?: boolean;
  shell?: string;
  json?: boolean;
};

const normalizeShell = (value?: string) => {
  if (!value) return undefined;
  const v = value.toLowerCase();
  if (["zsh", "bash", "fish", "pwsh"].includes(v)) return v;
  throw new Error("Unknown shell");
};

const resolveEnvShell = (shell?: string) => {
  if (shell === "pwsh") return "ps1" as const;
  if (process.platform === "win32") return "ps1" as const;
  return "sh" as const;
};

export const registerSetupCommands = (program: Command) => {
  const setup = program.command("setup").description("Setup CLI environment");

  setup
    .command("env")
    .description("Generate environment variables")
    .option("--key <id>")
    .option("--print", "Print env to stdout")
    .option("--install", "Install into shell rc")
    .option("--shell <shell>", "zsh|bash|fish|pwsh")
    .option("--json", "Output JSON")
    .action(async (options: SetupEnvOptions) => {
      const shell = normalizeShell(options.shell);
      const configDir = resolveConfigDir();
      const envShell = resolveEnvShell(shell);
      const { consumerService } = createApiClients({});
      let keyId = options.key;
      if (!keyId) {
        if (!process.stdin.isTTY) {
          throw new Error("缺少 key id");
        }
        const selected = await selectConsumer(consumerService);
        if (!selected?.id) return;
        keyId = selected.id;
      }
      const consumer = await consumerService.GetConsumer({ id: keyId });
      if (!consumer?.apiKey) {
        throw new Error("API key 不存在，请先创建或重新选择。");
      }
      const content = renderEnv(envShell, {
        openaiBaseUrl: BASE_URL,
        openaiApiKey: consumer.apiKey,
        anthropicBaseUrl: BASE_URL,
        anthropicApiKey: consumer.apiKey,
      });

      if (options.print) {
        if (options.json) {
          console.log(JSON.stringify({ content }, null, 2));
        } else {
          console.log(content);
        }
        return;
      }

      const envPath = getEnvFilePath(envShell, configDir);
      writeEnvFile(envPath, content);

      let installed = false;
      if (options.install) {
        const homeDir = require("node:os").homedir();
        const rcPath = resolveShellRcPath(shell ?? "bash", homeDir);
        if (rcPath) {
          const sourceLine =
            envShell === "ps1"
              ? `. ${envPath}`
              : `source ${envPath}`;
          installed = appendRcIfMissing(rcPath, sourceLine);
        }
      }

      if (options.json) {
        console.log(
          JSON.stringify(
            { path: envPath, installed, keyId },
            null,
            2
          )
        );
        return;
      }

      console.log("To configure your shell, run:");
      console.log(envShell === "ps1" ? `. ${envPath}` : `source ${envPath}`);
    });
};
```

**Step 2: Register the command**

```ts
import { registerSetupCommands } from "./setup";

// inside registerCommands
registerSetupCommands(program);
```

**Step 3: Run command tests to verify pass**

Run: `npm test -- tests/cmd/setup.test.ts`
Expected: PASS

**Step 4: Commit command wiring**

```bash
git add src/cmd/setup.ts src/cmd/index.ts tests/cmd/setup.test.ts
git commit -m "feat: add setup env command"
```

### Task 4: Full test run

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Commit (if needed)**

```bash
git status -sb
```

If clean, no commit needed.
