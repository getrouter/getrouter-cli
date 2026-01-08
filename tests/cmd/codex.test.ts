import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts from "prompts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import type { ConsumerService } from "../../src/generated/router/dashboard/v1";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
const codexConfigPath = (dir: string) =>
  path.join(dir, ".codex", "config.toml");
const codexAuthPath = (dir: string) => path.join(dir, ".codex", "auth.json");

const mockConsumer = { id: "c1", apiKey: "key-123" };

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", {
    value,
    configurable: true,
  });
};

const ENV_KEYS = ["GETROUTER_CONFIG_DIR", "HOME", "SHELL"];
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
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

describe("codex command", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ models: [] }),
      }),
    );
  });

  it("fetches codex models from remote endpoint", async () => {
    setStdinTTY(true);
    const dir = makeDir();
    process.env.HOME = dir;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        models: ["gpt-5.2-codex"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    prompts.inject(["gpt-5.2-codex", "extra_high", mockConsumer]);
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
    });

    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "codex"]);

    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).toContain(
      "/v1/dashboard/providers/models?tag=codex",
    );
  });

  it("writes codex config and auth after interactive flow", async () => {
    setStdinTTY(true);
    const dir = makeDir();
    process.env.HOME = dir;
    prompts.inject(["gpt-5.2-codex", "extra_high", mockConsumer]);
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
    });

    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "codex"]);

    const config = fs.readFileSync(codexConfigPath(dir), "utf8");
    expect(config).toContain('model = "gpt-5.2-codex"');
    expect(config).toContain('model_reasoning_effort = "xhigh"');
    expect(config).toContain('model_provider = "getrouter"');
    expect(config).toContain("[model_providers.getrouter]");
    expect(config).toContain('name = "getrouter"');
    expect(config).toContain('base_url = "https://api.getrouter.dev/codex"');
    expect(config).toContain('wire_api = "responses"');
    expect(config).toContain("requires_openai_auth = true");

    const auth = JSON.parse(fs.readFileSync(codexAuthPath(dir), "utf8"));
    expect(auth.OPENAI_API_KEY).toBe("key-123");
  });

  it("merges existing codex config and auth", async () => {
    setStdinTTY(true);
    const dir = makeDir();
    process.env.HOME = dir;
    const codexDir = path.join(dir, ".codex");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(
      codexConfigPath(dir),
      [
        'theme = "dark"',
        'model = "old-model"',
        'model_provider = "other"',
        "",
        "[model_providers.other]",
        'name = "other"',
        'base_url = "https://example.com"',
        "",
        "[model_providers.getrouter]",
        'name = "old"',
        'base_url = "https://old.example.com"',
        'extra = "keep"',
        "",
      ].join("\n"),
    );
    fs.writeFileSync(
      codexAuthPath(dir),
      JSON.stringify({ OTHER: "keep", OPENAI_API_KEY: "old" }, null, 2),
    );
    prompts.inject(["gpt-5.2", "low", mockConsumer]);
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
    });

    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "codex"]);

    const config = fs.readFileSync(codexConfigPath(dir), "utf8");
    expect(config).toContain('theme = "dark"');
    expect(config).toContain("[model_providers.other]");
    expect(config).toContain('base_url = "https://example.com"');
    expect(config).toContain('extra = "keep"');
    expect(config).toContain('model = "gpt-5.2"');
    expect(config).toContain('model_reasoning_effort = "low"');
    expect(config).toContain('model_provider = "getrouter"');
    expect(config).toContain('base_url = "https://api.getrouter.dev/codex"');

    const auth = JSON.parse(fs.readFileSync(codexAuthPath(dir), "utf8"));
    expect(auth.OPENAI_API_KEY).toBe("key-123");
    expect(auth.OTHER).toBe("keep");
  });

  it("supports -m to set a custom model", async () => {
    setStdinTTY(true);
    const dir = makeDir();
    process.env.HOME = dir;
    prompts.inject(["extra_high", mockConsumer]);
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
    });

    const program = createProgram();
    await program.parseAsync([
      "node",
      "getrouter",
      "codex",
      "-m",
      "legacy-model",
    ]);

    const config = fs.readFileSync(codexConfigPath(dir), "utf8");
    expect(config).toContain('model = "legacy-model"');
  });

  it("uninstall removes getrouter entries but keeps others", async () => {
    const dir = makeDir();
    process.env.HOME = dir;
    const codexDir = path.join(dir, ".codex");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(
      codexConfigPath(dir),
      [
        'theme = "dark"',
        'model = "keep"',
        'model_reasoning_effort = "low"',
        'model_provider = "getrouter"',
        "",
        "[model_providers.getrouter]",
        'name = "getrouter"',
        'base_url = "https://api.getrouter.dev/codex"',
        "",
        "[model_providers.other]",
        'name = "other"',
      ].join("\n"),
    );
    fs.writeFileSync(
      codexAuthPath(dir),
      JSON.stringify({ OTHER: "keep", OPENAI_API_KEY: "old" }, null, 2),
    );

    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "codex", "uninstall"]);

    const config = fs.readFileSync(codexConfigPath(dir), "utf8");
    expect(config).toContain('theme = "dark"');
    expect(config).toContain("[model_providers.other]");
    expect(config).not.toContain("[model_providers.getrouter]");
    expect(config).not.toContain('model_provider = "getrouter"');
    expect(config).not.toContain('model_reasoning_effort = "low"');
    expect(config).not.toContain('model = "keep"');

    const auth = JSON.parse(fs.readFileSync(codexAuthPath(dir), "utf8"));
    expect(auth.OTHER).toBe("keep");
    expect(auth.OPENAI_API_KEY).toBeUndefined();
  });

  it("uninstall leaves root keys when provider is not getrouter", async () => {
    const dir = makeDir();
    process.env.HOME = dir;
    const codexDir = path.join(dir, ".codex");
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(
      codexConfigPath(dir),
      [
        'model = "keep"',
        'model_reasoning_effort = "low"',
        'model_provider = "other"',
        "",
        "[model_providers.getrouter]",
        'name = "getrouter"',
      ].join("\n"),
    );

    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "codex", "uninstall"]);

    const config = fs.readFileSync(codexConfigPath(dir), "utf8");
    expect(config).toContain('model = "keep"');
    expect(config).toContain('model_provider = "other"');
    expect(config).toContain('model_reasoning_effort = "low"');
    expect(config).not.toContain("[model_providers.getrouter]");
  });
});
