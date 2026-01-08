import { describe, expect, it } from "vitest";
import { defaultAuthState, defaultConfig } from "../../src/core/config/types";

describe("config types defaults", () => {
  it("provides sane defaults", () => {
    expect(defaultConfig().apiBase).toBe("https://getrouter.dev");
    expect(defaultConfig().json).toBe(false);
    expect(defaultAuthState().accessToken).toBe("");
  });
});
