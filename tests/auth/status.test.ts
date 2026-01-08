import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { clearAuth, getAuthStatus } from "../../src/core/auth";
import { readAuth, writeAuth } from "../../src/core/config";

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

describe("auth status", () => {
  it("returns logged_out when missing", () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    const status = getAuthStatus();
    expect(status.status).toBe("logged_out");
  });

  it("returns logged_out when expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "2026-01-01T00:00:00Z",
      tokenType: "Bearer",
    });
    const status = getAuthStatus();
    expect(status.status).toBe("logged_out");
    vi.useRealTimers();
  });

  it("returns logged_in when valid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "tokenvalue",
      refreshToken: "refreshvalue",
      expiresAt: "2026-01-03T00:00:00Z",
      tokenType: "Bearer",
    });
    const status = getAuthStatus();
    expect(status.status).toBe("logged_in");
    expect(status.note).toBeUndefined();
    vi.useRealTimers();
  });

  it("clears auth state", () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "c",
      tokenType: "Bearer",
    });
    clearAuth();
    const auth = readAuth();
    expect(auth.accessToken).toBe("");
  });
});
