import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildApiUrl } from "../../src/core/http/url";

describe("buildApiUrl", () => {
  it("joins base and path safely", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ apiBase: "https://getrouter.dev/" }),
    );
    expect(buildApiUrl("/v1/test")).toBe("https://getrouter.dev/v1/test");
  });
});
