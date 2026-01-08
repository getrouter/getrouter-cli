import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCodexModelChoices,
  MODEL_CHOICES,
  mapReasoningValue,
  REASONING_CHOICES,
} from "../../../src/core/interactive/codex";

describe("codex interactive helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps extra high to xhigh", () => {
    expect(mapReasoningValue("extra_high")).toBe("xhigh");
  });

  it("exports model and reasoning choices", () => {
    expect(MODEL_CHOICES.length).toBeGreaterThan(0);
    expect(REASONING_CHOICES.length).toBeGreaterThan(0);
  });

  it("fetches codex models from ListProviderModels(tag=codex)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        models: ["older-codex-model", "newer-codex-model"],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const choices = await getCodexModelChoices();
    expect(choices[0]?.value).toBe("newer-codex-model");
    expect(choices[1]?.value).toBe("older-codex-model");
    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).toContain(
      "/v1/dashboard/providers/models?tag=codex",
    );
  });
});
