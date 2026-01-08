import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts from "prompts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import {
  getEnvFilePath,
  getHookFilePath,
  resolveShellRcPath,
} from "../../src/core/setup/env";
import type {
  AuthService,
  ConsumerService,
  SubscriptionService,
} from "../../src/generated/router/dashboard/v1";

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

const ENV_KEYS = [
  "GETROUTER_CONFIG_DIR",
  "HOME",
  "SHELL",
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_API_KEY",
];

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  setStdinTTY(originalIsTTY);
  prompts.inject([]);
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe("claude command", () => {
  it("writes Anthropic-only env file", async () => {
    setStdinTTY(true);
    prompts.inject([mockConsumer]);
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    process.env.HOME = dir;
    process.env.SHELL = "/bin/bash";
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({
          consumers: [
            {
              id: "c1",
              name: "dev",
              enabled: true,
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
        }),
        GetConsumer: vi.fn().mockResolvedValue(mockConsumer),
      } as unknown as ConsumerService,
      subscriptionService: {} as SubscriptionService,
      authService: {} as AuthService,
    });
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "claude"]);
    const content = fs.readFileSync(getEnvFilePath("sh", dir), "utf8");
    expect(content).toContain("ANTHROPIC_BASE_URL");
    expect(content).toContain("ANTHROPIC_API_KEY");
    expect(content).not.toContain("OPENAI_BASE_URL");
    expect(content).not.toContain("OPENAI_API_KEY");
  });

  it("installs into rc and updates process env", async () => {
    setStdinTTY(true);
    prompts.inject([mockConsumer]);
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    process.env.HOME = dir;
    process.env.SHELL = "/bin/bash";
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({
          consumers: [
            {
              id: "c1",
              name: "dev",
              enabled: true,
              createdAt: "2026-01-01T00:00:00Z",
            },
          ],
        }),
        GetConsumer: vi.fn().mockResolvedValue(mockConsumer),
      } as unknown as ConsumerService,
      subscriptionService: {} as SubscriptionService,
      authService: {} as AuthService,
    });
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "claude", "--install"]);
    const envPath = getEnvFilePath("sh", dir);
    const hookPath = getHookFilePath("bash", dir);
    const rcPath = resolveShellRcPath("bash", dir);
    const rcContent = fs.readFileSync(rcPath ?? "", "utf8");
    expect(rcContent).toContain(`source ${envPath}`);
    expect(rcContent).toContain(`source ${hookPath}`);
    expect(fs.existsSync(hookPath)).toBe(true);
    expect(process.env.ANTHROPIC_BASE_URL).toBe(
      "https://api.getrouter.dev/claude",
    );
    expect(process.env.ANTHROPIC_API_KEY).toBe("key-123");
  });
});
