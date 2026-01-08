import { describe, expect, it, vi } from "vitest";
import { isServerError, withRetry } from "../../src/core/http/retry";

describe("isServerError", () => {
  it("returns true for 5xx errors", () => {
    expect(isServerError(500)).toBe(true);
    expect(isServerError(502)).toBe(true);
    expect(isServerError(503)).toBe(true);
    expect(isServerError(599)).toBe(true);
  });

  it("returns true for 408 and 429", () => {
    expect(isServerError(408)).toBe(true);
    expect(isServerError(429)).toBe(true);
  });

  it("returns false for 4xx client errors", () => {
    expect(isServerError(400)).toBe(false);
    expect(isServerError(401)).toBe(false);
    expect(isServerError(403)).toBe(false);
    expect(isServerError(404)).toBe(false);
  });

  it("returns false for 2xx success", () => {
    expect(isServerError(200)).toBe(false);
    expect(isServerError(201)).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce("success");

    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await withRetry(fn, { sleep });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("respects maxRetries", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("network error"));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withRetry(fn, { maxRetries: 2, sleep })).rejects.toThrow(
      "network error",
    );
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("calls onRetry callback", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fail"))
      .mockResolvedValueOnce("ok");

    const onRetry = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    await withRetry(fn, { onRetry, sleep });

    expect(onRetry).toHaveBeenCalledWith(expect.any(TypeError), 1, 1000);
  });

  it("uses exponential backoff", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fail1"))
      .mockRejectedValueOnce(new TypeError("fail2"))
      .mockResolvedValueOnce("ok");

    const onRetry = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    await withRetry(fn, {
      onRetry,
      sleep,
      initialDelayMs: 100,
      maxDelayMs: 500,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(TypeError), 1, 100);
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(TypeError), 2, 200);
  });

  it("respects maxDelayMs", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("1"))
      .mockRejectedValueOnce(new TypeError("2"))
      .mockRejectedValueOnce(new TypeError("3"))
      .mockResolvedValueOnce("ok");

    const onRetry = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    await withRetry(fn, {
      onRetry,
      sleep,
      initialDelayMs: 100,
      maxDelayMs: 150,
      maxRetries: 5,
    });

    expect(onRetry).toHaveBeenNthCalledWith(3, expect.any(TypeError), 3, 150);
  });

  it("does not retry when shouldRetry returns false", async () => {
    const error = new Error("non-retryable");
    const fn = vi.fn().mockRejectedValue(error);
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(withRetry(fn, { shouldRetry })).rejects.toThrow(
      "non-retryable",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 status errors", async () => {
    const error = { status: 500, message: "server error" };
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce("ok");

    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await withRetry(fn, { sleep });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 rate limit", async () => {
    const error = { status: 429, message: "rate limited" };
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce("ok");

    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await withRetry(fn, { sleep });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
