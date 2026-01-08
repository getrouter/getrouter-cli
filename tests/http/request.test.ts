import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "../../src/core/http/request";

const originalCookieName = process.env.GETROUTER_AUTH_COOKIE;
const originalKratosCookie = process.env.KRATOS_AUTH_COOKIE;

afterEach(() => {
  if (originalCookieName === undefined) {
    delete process.env.GETROUTER_AUTH_COOKIE;
  } else {
    process.env.GETROUTER_AUTH_COOKIE = originalCookieName;
  }
  if (originalKratosCookie === undefined) {
    delete process.env.KRATOS_AUTH_COOKIE;
  } else {
    process.env.KRATOS_AUTH_COOKIE = originalKratosCookie;
  }
});

describe("requestJson", () => {
  it("adds Authorization when token exists", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ accessToken: "t" }),
    );

    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: true,
          json: async () => ({ ok: true }),
        }) as Response,
    );

    const res = await requestJson<{ ok: boolean }>({
      path: "/v1/test",
      method: "GET",
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    const call = fetchSpy.mock.calls[0] as Parameters<typeof fetch> | undefined;
    const init = call?.[1];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer t");
    expect(headers.Cookie).toBe("access_token=t");
  });

  it("uses GETROUTER_AUTH_COOKIE when set", async () => {
    process.env.GETROUTER_AUTH_COOKIE = "router_auth";
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ accessToken: "t2" }),
    );

    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: true,
          json: async () => ({ ok: true }),
        }) as Response,
    );

    await requestJson({
      path: "/v1/test",
      method: "GET",
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    const call = fetchSpy.mock.calls[0] as Parameters<typeof fetch> | undefined;
    const init = call?.[1];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Cookie).toBe("router_auth=t2");
  });

  it("retries with refreshed token on 401", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({
        accessToken: "expired",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        tokenType: "Bearer",
      }),
    );

    let callCount = 0;
    const fetchSpy = vi.fn(
      async (input: RequestInfo | URL, _init?: RequestInit) => {
        callCount++;
        const url = typeof input === "string" ? input : input.toString();

        // Refresh token endpoint
        if (url.includes("auth/token")) {
          return {
            ok: true,
            json: async () => ({
              accessToken: "new-access",
              refreshToken: "new-refresh",
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            }),
          } as Response;
        }

        // First call returns 401, second succeeds
        if (callCount === 1) {
          return {
            ok: false,
            status: 401,
            statusText: "Unauthorized",
            json: async () => ({ message: "Token expired" }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ ok: true }),
        } as Response;
      },
    );

    const res = await requestJson<{ ok: boolean }>({
      path: "/v1/test",
      method: "GET",
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(res.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // initial + refresh + retry
  });

  it("does not retry when no refresh token", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ accessToken: "expired", refreshToken: "" }),
    );

    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({ message: "Token expired" }),
        }) as Response,
    );

    await expect(
      requestJson({
        path: "/v1/test",
        method: "GET",
        fetchImpl: fetchSpy as unknown as typeof fetch,
      }),
    ).rejects.toThrow();

    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry
  });

  it("retries on 5xx server errors", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ accessToken: "token", refreshToken: "" }),
    );

    let callCount = 0;
    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            json: async () => ({ message: "Server overloaded" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ ok: true }),
        } as Response;
      },
    );

    const noopSleep = async () => {};
    const res = await requestJson<{ ok: boolean }>({
      path: "/v1/test",
      method: "GET",
      fetchImpl: fetchSpy as unknown as typeof fetch,
      maxRetries: 2,
      _retrySleep: noopSleep,
    });

    expect(res.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx client errors", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ accessToken: "token", refreshToken: "" }),
    );

    const fetchSpy = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ message: "Not found" }),
        }) as Response,
    );

    await expect(
      requestJson({
        path: "/v1/test",
        method: "GET",
        fetchImpl: fetchSpy as unknown as typeof fetch,
        maxRetries: 2,
      }),
    ).rejects.toThrow();

    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry on 404
  });
});
