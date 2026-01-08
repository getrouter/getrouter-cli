import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../src/cli";

describe("getrouter cli", () => {
  it("exposes name and help", () => {
    const program = createProgram();
    expect(program.name()).toBe("getrouter");
    expect(program.helpInformation()).toContain("getrouter");
  });

  it("rejects removed config command", async () => {
    const writeErr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({
      writeErr: () => {},
    });
    try {
      await expect(
        program.parseAsync(["node", "getrouter", "config"]),
      ).rejects.toBeTruthy();
      expect(writeErr).not.toHaveBeenCalled();
    } finally {
      writeErr.mockRestore();
    }
  });

  it("only ships registered command entrypoints", () => {
    const cmdDir = path.join(process.cwd(), "src", "cmd");
    const files = readdirSync(cmdDir).filter((file) => file.endsWith(".ts"));
    const expected = [
      "auth.ts",
      "claude.ts",
      "codex.ts",
      "env.ts",
      "index.ts",
      "keys.ts",
      "models.ts",
      "status.ts",
      "usages.ts",
    ];
    expect(files.sort()).toEqual(expected.sort());
  });
});
