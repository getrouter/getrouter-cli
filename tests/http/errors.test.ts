import { describe, expect, it } from "vitest";
import { createApiError } from "../../src/core/http/errors";

describe("api errors", () => {
  it("normalizes error payload", () => {
    const err = createApiError(
      { code: "BAD", message: "oops" },
      "fallback",
      400,
    );
    expect(err.message).toBe("oops");
    expect(err.code).toBe("BAD");
    expect(err.status).toBe(400);
  });
});
