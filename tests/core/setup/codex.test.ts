import { describe, expect, it } from "vitest";
import {
  mergeAuthJson,
  mergeCodexToml,
  removeAuthJson,
  removeCodexConfig,
} from "../../../src/core/setup/codex";

describe("codex setup helpers", () => {
  it("merges codex toml at root and provider table", () => {
    const input = [
      'other = "keep"',
      'model = "old-model"',
      "",
      "[model_providers.other]",
      'name = "x"',
      "",
      "[model_providers.getrouter]",
      'name = "old"',
      'extra = "keep"',
      "",
    ].join("\n");
    const output = mergeCodexToml(input, {
      model: "gpt-5.2-codex",
      reasoning: "xhigh",
    });
    expect(output).toContain('model = "gpt-5.2-codex"');
    expect(output).toContain('model_reasoning_effort = "xhigh"');
    expect(output).toContain('model_provider = "getrouter"');
    expect(output).toContain("[model_providers.getrouter]");
    expect(output).toContain('base_url = "https://api.getrouter.dev/codex"');
    expect(output).toContain('wire_api = "responses"');
    expect(output).toContain("requires_openai_auth = true");
    expect(output).toContain('other = "keep"');
    expect(output).toContain('extra = "keep"');
  });

  it("merges auth json", () => {
    const output = mergeAuthJson({ existing: "keep" }, "key-123");
    expect(output.OPENAI_API_KEY).toBe("key-123");
    expect(output.existing).toBe("keep");
  });

  it("removes getrouter provider section and restores root keys when provided", () => {
    const input = [
      'model = "gpt-5.2-codex"',
      'model_reasoning_effort = "xhigh"',
      'model_provider = "getrouter"',
      "",
      "[model_providers.getrouter]",
      'name = "getrouter"',
      "",
      "[model_providers.openai]",
      'name = "openai"',
    ].join("\n");

    const { content, changed } = removeCodexConfig(input, {
      restoreRoot: {
        model: '"user-model"',
        reasoning: '"medium"',
        provider: '"openai"',
      },
    });
    expect(changed).toBe(true);
    expect(content).toContain('model = "user-model"');
    expect(content).toContain('model_reasoning_effort = "medium"');
    expect(content).toContain('model_provider = "openai"');
    expect(content).toContain("[model_providers.openai]");
    expect(content).not.toContain("[model_providers.getrouter]");
  });

  it("removes root keys when provider is getrouter and no restore is provided", () => {
    const input = [
      'model = "gpt-5.2-codex"',
      'model_reasoning_effort = "xhigh"',
      'model_provider = "getrouter"',
      "",
      "[model_providers.getrouter]",
      'name = "getrouter"',
    ].join("\n");

    const { content } = removeCodexConfig(input);
    expect(content).not.toContain('model = "gpt-5.2-codex"');
    expect(content).not.toContain('model_reasoning_effort = "xhigh"');
    expect(content).not.toContain('model_provider = "getrouter"');
    expect(content).not.toContain("[model_providers.getrouter]");
  });

  it("restores OPENAI_API_KEY when installed key matches current", () => {
    const input = {
      OPENAI_API_KEY: "new-key",
      OTHER: "keep",
    } as Record<string, unknown>;
    const { data, changed } = removeAuthJson(input, {
      installed: "new-key",
      restore: "old-key",
    });
    expect(changed).toBe(true);
    expect(data.OPENAI_API_KEY).toBe("old-key");
    expect(data.OTHER).toBe("keep");
  });

  it("removes OPENAI_API_KEY when installed key matches and no restore is available", () => {
    const input = {
      OPENAI_API_KEY: "new-key",
      OTHER: "keep",
    } as Record<string, unknown>;
    const { data, changed } = removeAuthJson(input, { installed: "new-key" });
    expect(changed).toBe(true);
    expect(data.OPENAI_API_KEY).toBeUndefined();
    expect(data.OTHER).toBe("keep");
  });

  it("leaves OPENAI_API_KEY when not forced and not installed", () => {
    const input = {
      OPENAI_API_KEY: "user-key",
      OTHER: "keep",
    } as Record<string, unknown>;
    const { data, changed } = removeAuthJson(input);
    expect(changed).toBe(false);
    expect(data.OPENAI_API_KEY).toBe("user-key");
    expect(data.OTHER).toBe("keep");
  });
});
