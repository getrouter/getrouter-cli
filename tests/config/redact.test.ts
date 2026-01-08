import { describe, expect, it } from "vitest";
import { redactSecrets } from "../../src/core/config/redact";

describe("redact", () => {
  it("redacts known secret fields", () => {
    const out = redactSecrets({
      accessToken: "secretcret",
      refreshToken: "secretret2",
      apiKey: "key",
      other: "ok",
    });
    expect(out.accessToken).toBe("secr...cret");
    expect(out.refreshToken).toBe("secr...ret2");
    expect(out.apiKey).toBe("****");
    expect(out.other).toBe("ok");
  });
});
