import { describe, expect, it } from "vitest";
import { mergeAuthJson, mergeCodexToml } from "../../../src/core/setup/codex";

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
});
