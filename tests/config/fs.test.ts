import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { readJsonFile, writeJsonFile } from "../../src/core/config/fs";

describe("config fs", () => {
  it("writes and reads JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    const file = path.join(dir, "config.json");
    writeJsonFile(file, { hello: "world" });
    expect(readJsonFile(file)).toEqual({ hello: "world" });
  });

  it("tolerates invalid JSON by returning null and backing up the file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    const file = path.join(dir, "config.json");
    fs.writeFileSync(file, "{", "utf8");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(readJsonFile(file)).toBeNull();
    } finally {
      warnSpy.mockRestore();
    }

    expect(fs.existsSync(file)).toBe(false);
    const backups = fs
      .readdirSync(dir)
      .filter(
        (name) => name.startsWith("config.corrupt-") && name.endsWith(".json"),
      );
    expect(backups.length).toBe(1);
  });
});
