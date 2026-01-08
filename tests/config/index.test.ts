import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  readAuth,
  readConfig,
  writeAuth,
  writeConfig,
} from "../../src/core/config";

describe("config read/write", () => {
  it("writes and reads config with defaults", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeConfig({ apiBase: "https://getrouter.dev", json: true });
    const cfg = readConfig();
    expect(cfg.apiBase).toBe("https://getrouter.dev");
    expect(cfg.json).toBe(true);
  });

  it("writes and reads auth state", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "c",
      tokenType: "Bearer",
    });
    const auth = readAuth();
    expect(auth.accessToken).toBe("a");
    expect(auth.refreshToken).toBe("b");
    expect(auth.expiresAt).toBe("c");
  });

  it("falls back to defaults when config.json is invalid JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(path.join(dir, "config.json"), "{", "utf8");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const cfg = readConfig();
      expect(cfg.apiBase).toBe("https://getrouter.dev");
      expect(cfg.json).toBe(false);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("defaults tokenType to Bearer", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "c",
      tokenType: "Bearer",
    });
    const auth = readAuth();
    expect(auth.tokenType).toBe("Bearer");
  });

  it("writes auth file with 0600 on unix", () => {
    if (process.platform === "win32") return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "c",
      tokenType: "Bearer",
    });
    const mode = fs.statSync(path.join(dir, "auth.json")).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
