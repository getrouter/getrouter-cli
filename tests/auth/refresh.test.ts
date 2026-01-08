import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureValidToken,
  isTokenExpiringSoon,
  refreshAccessToken,
} from "../../src/core/auth/refresh";
import { readAuth, writeAuth } from "../../src/core/config";

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

describe("isTokenExpiringSoon", () => {
  it("returns true for empty string", () => {
    expect(isTokenExpiringSoon("")).toBe(true);
  });

  it("returns true for invalid date", () => {
    expect(isTokenExpiringSoon("not-a-date")).toBe(true);
  });

  it("returns true for expired token", () => {
    const past = new Date(Date.now() - 10000).toISOString();
    expect(isTokenExpiringSoon(past)).toBe(true);
  });

  it("returns true for token expiring within buffer", () => {
    const soon = new Date(Date.now() + 30000).toISOString(); // 30 seconds
    expect(isTokenExpiringSoon(soon)).toBe(true);
  });

  it("returns false for token with plenty of time", () => {
    const future = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    expect(isTokenExpiringSoon(future)).toBe(false);
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    process.env.GETROUTER_CONFIG_DIR = makeDir();
  });

  it("returns null when no refresh token", async () => {
    writeAuth({
      accessToken: "",
      refreshToken: "",
      expiresAt: "",
      tokenType: "",
    });
    const result = await refreshAccessToken({});
    expect(result).toBeNull();
  });

  it("returns null when refresh fails", async () => {
    writeAuth({
      accessToken: "old",
      refreshToken: "refresh",
      expiresAt: "",
      tokenType: "Bearer",
    });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    const result = await refreshAccessToken({
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });

  it("refreshes and updates auth on success", async () => {
    writeAuth({
      accessToken: "old",
      refreshToken: "refresh",
      expiresAt: "",
      tokenType: "Bearer",
    });
    const newToken = {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: "2026-12-01T00:00:00Z",
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => newToken,
    });
    const result = await refreshAccessToken({
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(result).toEqual(newToken);
    const saved = readAuth();
    expect(saved.accessToken).toBe("new-access");
    expect(saved.refreshToken).toBe("new-refresh");
  });
});

describe("ensureValidToken", () => {
  beforeEach(() => {
    process.env.GETROUTER_CONFIG_DIR = makeDir();
  });

  it("returns false when no tokens", async () => {
    writeAuth({
      accessToken: "",
      refreshToken: "",
      expiresAt: "",
      tokenType: "",
    });
    const result = await ensureValidToken({});
    expect(result).toBe(false);
  });

  it("returns true when token is still valid", async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    writeAuth({
      accessToken: "valid",
      refreshToken: "refresh",
      expiresAt: future,
      tokenType: "Bearer",
    });
    const result = await ensureValidToken({});
    expect(result).toBe(true);
  });

  it("refreshes when token is expiring soon", async () => {
    const soon = new Date(Date.now() + 10000).toISOString(); // 10 seconds
    writeAuth({
      accessToken: "expiring",
      refreshToken: "refresh",
      expiresAt: soon,
      tokenType: "Bearer",
    });
    const newToken = {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => newToken,
    });
    const result = await ensureValidToken({
      fetchImpl: mockFetch as unknown as typeof fetch,
    });
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });
});
