# Config Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `getrouter config get/set` commands with fixed keys (`apiBase`, `json`), validation, and JSON output option.

**Architecture:** Implement a `config` command module under `src/cmd/config.ts` that uses the `core/config` read/write helpers. Keep parsing/validation in the command layer, with small pure helpers for value parsing and apiBase normalization to make testing easier.

**Tech Stack:** TypeScript, commander, vitest.

---

### Task 1: Parse/Normalize Helpers (TDD)

**Files:**
- Create: `src/cmd/config-helpers.ts`
- Test: `tests/cmd/config-helpers.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeApiBase, parseConfigValue } from "../../src/cmd/config-helpers";

describe("config helpers", () => {
  it("normalizes apiBase", () => {
    expect(normalizeApiBase("https://getrouter.dev/")).toBe("https://getrouter.dev");
  });

  it("parses json values", () => {
    expect(parseConfigValue("json", "true")).toBe(true);
    expect(parseConfigValue("json", "0")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
export const normalizeApiBase = (value: string) =>
  value.trim().replace(/\\/+$/, "");

export const parseConfigValue = (key: "apiBase" | "json", raw: string) => {
  if (key === "apiBase") {
    const normalized = normalizeApiBase(raw);
    if (!/^https?:\\/\\//.test(normalized)) {
      throw new Error("apiBase must start with http:// or https://");
    }
    return normalized;
  }
  const lowered = raw.toLowerCase();
  if (["true", "1"].includes(lowered)) return true;
  if (["false", "0"].includes(lowered)) return false;
  throw new Error("json must be true/false or 1/0");
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cmd/config-helpers.ts tests/cmd/config-helpers.test.ts
git commit -m "feat: add config parsing helpers"
```

---

### Task 2: Config Command (TDD)

**Files:**
- Create: `src/cmd/config.ts`
- Modify: `src/cmd/index.ts`
- Test: `tests/cmd/config.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { createProgram } from "../../src/cli";

describe("config command", () => {
  it("prints full config for get", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "config", "get"]);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (config command missing).

**Step 3: Implement minimal config command**

`src/cmd/config.ts`

```ts
import { Command } from "commander";
import { readConfig, writeConfig } from "../core/config";
import { parseConfigValue } from "./config-helpers";

const VALID_KEYS = new Set(["apiBase", "json"]);

export const registerConfigCommands = (program: Command) => {
  const config = program.command("config").description("Manage CLI config");

  config
    .command("get")
    .argument("[key]")
    .option("--json", "Output JSON")
    .action((key: string | undefined, options: { json?: boolean }) => {
      const cfg = readConfig();
      if (!key) {
        if (options.json) {
          console.log(JSON.stringify(cfg, null, 2));
        } else {
          console.log(`apiBase=${cfg.apiBase}`);
          console.log(`json=${cfg.json}`);
        }
        return;
      }
      if (!VALID_KEYS.has(key)) {
        throw new Error("Unknown config key");
      }
      const value = (cfg as any)[key];
      if (options.json) {
        console.log(JSON.stringify({ [key]: value }, null, 2));
      } else {
        console.log(`${key}=${value}`);
      }
    });

  config
    .command("set")
    .argument("<key>")
    .argument("<value>")
    .option("--json", "Output JSON")
    .action((key: string, value: string, options: { json?: boolean }) => {
      if (!VALID_KEYS.has(key)) {
        throw new Error("Unknown config key");
      }
      const cfg = readConfig();
      const parsed = parseConfigValue(key as "apiBase" | "json", value);
      const next = { ...cfg, [key]: parsed };
      writeConfig(next);
      if (options.json) {
        console.log(JSON.stringify(next, null, 2));
      } else {
        console.log(`${key}=${(next as any)[key]}`);
      }
    });
};
```

`src/cmd/index.ts` add:

```ts
import { registerConfigCommands } from "./config";
// ...
registerConfigCommands(program);
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cmd/config.ts src/cmd/index.ts tests/cmd/config.test.ts
git commit -m "feat: add config get/set commands"
```

---

### Task 3: Validation & Error Tests (TDD)

**Files:**
- Modify: `tests/cmd/config.test.ts`

**Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { parseConfigValue } from "../../src/cmd/config-helpers";

describe("config validation", () => {
  it("rejects invalid json value", () => {
    expect(() => parseConfigValue("json", "nope")).toThrow();
  });

  it("rejects invalid apiBase", () => {
    expect(() => parseConfigValue("apiBase", "ftp://bad")).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL if behavior not enforced.

**Step 3: Implement minimal fixes**

Adjust `parseConfigValue` as needed (should already throw for invalid).

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/cmd/config.test.ts src/cmd/config-helpers.ts
git commit -m "test: cover config validation"
```
