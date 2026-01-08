import { describe, expect, it, vi } from "vitest";
import { generateAuthCode, pollAuthorize } from "../../src/core/auth/device";

const makeErr = (status: number) => Object.assign(new Error("err"), { status });

describe("device auth", () => {
  it("polls until authorize succeeds", async () => {
    const authorize = vi
      .fn()
      .mockRejectedValueOnce(makeErr(404))
      .mockResolvedValue({
        accessToken: "a",
        refreshToken: "b",
        expiresAt: "2026-01-03T00:00:00Z",
      });
    let now = 0;
    const res = await pollAuthorize({
      authorize,
      code: "abc",
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      initialDelayMs: 1,
      maxDelayMs: 2,
      timeoutMs: 100,
    });
    expect(res.accessToken).toBe("a");
    expect(authorize).toHaveBeenCalledTimes(2);
  });

  it("fails on 400/403", async () => {
    await expect(
      pollAuthorize({
        authorize: vi.fn().mockRejectedValue(makeErr(400)),
        code: "abc",
        sleep: async () => {},
        now: () => 0,
        timeoutMs: 10,
      }),
    ).rejects.toThrow("Auth code already used");
    await expect(
      pollAuthorize({
        authorize: vi.fn().mockRejectedValue(makeErr(403)),
        code: "abc",
        sleep: async () => {},
        now: () => 0,
        timeoutMs: 10,
      }),
    ).rejects.toThrow("Auth code expired");
  });

  it("times out after deadline", async () => {
    const authorize = vi.fn().mockRejectedValue(makeErr(404));
    let now = 0;
    await expect(
      pollAuthorize({
        authorize,
        code: "abc",
        now: () => now,
        sleep: async (ms) => {
          now += ms;
        },
        initialDelayMs: 5,
        maxDelayMs: 5,
        timeoutMs: 6,
      }),
    ).rejects.toThrow("Login timed out");
  });

  it("generates 13-char base32 auth code", () => {
    const id = generateAuthCode();
    expect(id).toMatch(/^[a-z2-7]{13}$/);
  });
});
