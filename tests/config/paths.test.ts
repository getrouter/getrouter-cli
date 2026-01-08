import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAuthPath, getConfigPath } from "../../src/core/config/paths";

describe("config paths", () => {
  const originalConfigDir = process.env.GETROUTER_CONFIG_DIR;

  const restore = () => {
    if (originalConfigDir === undefined) {
      delete process.env.GETROUTER_CONFIG_DIR;
      return;
    }
    process.env.GETROUTER_CONFIG_DIR = originalConfigDir;
  };

  it("returns ~/.getrouter paths", () => {
    delete process.env.GETROUTER_CONFIG_DIR;
    expect(getConfigPath()).toContain(".getrouter");
    expect(getConfigPath()).toContain("config.json");
    expect(getAuthPath()).toContain("auth.json");
    restore();
  });

  it("uses GETROUTER_CONFIG_DIR when set", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    expect(getConfigPath()).toBe(path.join(dir, "config.json"));
    expect(getAuthPath()).toBe(path.join(dir, "auth.json"));
    restore();
  });
});
