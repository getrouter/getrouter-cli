# getrouter CLI Config Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core config/auth file IO utilities for `~/.getrouter`, including read/write helpers, defaults, and safe redaction for output.

**Architecture:** Add a small `core/config` module that reads/writes JSON files under `~/.getrouter`, exposes typed helpers for config and auth state, and includes a redaction utility for secrets. Use sync file IO for simplicity in CLI startup paths.

**Tech Stack:** Node.js fs/path/os, TypeScript, vitest.

---

### Task 1: Auth & Config Types

**Files:**
- Create: `src/core/config/types.ts`
- Test: `tests/config/types.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { defaultConfig, defaultAuthState } from "../../src/core/config/types";

describe("config types defaults", () => {
  it("provides sane defaults", () => {
    expect(defaultConfig().apiBase).toBe("https://getrouter.dev");
    expect(defaultConfig().json).toBe(false);
    expect(defaultAuthState().accessToken).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
export type ConfigFile = {
  apiBase: string;
  json: boolean;
};

export type AuthState = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export const defaultConfig = (): ConfigFile => ({
  apiBase: "https://getrouter.dev",
  json: false,
});

export const defaultAuthState = (): AuthState => ({
  accessToken: "",
  refreshToken: "",
  expiresAt: "",
});
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/config/types.ts tests/config/types.test.ts
git commit -m "feat: add config/auth types and defaults"
```

---

### Task 2: Config Paths & File Helpers (TDD)

**Files:**
- Create: `src/core/config/paths.ts`
- Create: `src/core/config/fs.ts`
- Test: `tests/config/paths.test.ts`
- Test: `tests/config/fs.test.ts`

**Step 1: Write failing tests**

`tests/config/paths.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { getAuthPath, getConfigPath } from "../../src/core/config/paths";

describe("config paths", () => {
  it("returns ~/.getrouter paths", () => {
    expect(getConfigPath()).toContain(".getrouter");
    expect(getConfigPath()).toContain("config.json");
    expect(getAuthPath()).toContain("auth.json");
  });
});
```

`tests/config/fs.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { readJsonFile, writeJsonFile } from "../../src/core/config/fs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("config fs", () => {
  it("writes and reads JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    const file = path.join(dir, "config.json");
    writeJsonFile(file, { hello: "world" });
    expect(readJsonFile(file)).toEqual({ hello: "world" });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal helpers**

`src/core/config/paths.ts`

```ts
import path from "node:path";
import { getConfigDir } from "../paths";

export const getConfigPath = () => path.join(getConfigDir(), "config.json");
export const getAuthPath = () => path.join(getConfigDir(), "auth.json");
```

`src/core/config/fs.ts`

```ts
import fs from "node:fs";

export const readJsonFile = <T = unknown>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
};

export const writeJsonFile = (filePath: string, value: unknown) => {
  fs.mkdirSync(require("node:path").dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};
```

**Step 4: Run tests to verify they pass**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/config/paths.ts src/core/config/fs.ts tests/config/paths.test.ts tests/config/fs.test.ts
git commit -m "feat: add config path and fs helpers"
```

---

### Task 3: Config/Auth Read & Write (TDD)

**Files:**
- Create: `src/core/config/index.ts`
- Test: `tests/config/index.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { readConfig, writeConfig, readAuth, writeAuth } from "../../src/core/config";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("config read/write", () => {
  it("writes and reads config with defaults", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeConfig({ apiBase: "https://getrouter.dev", json: true });
    const cfg = readConfig();
    expect(cfg.apiBase).toBe("https://getrouter.dev");
    expect(cfg.json).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal read/write**

`src/core/config/index.ts`

```ts
import path from "node:path";
import { defaultConfig, defaultAuthState, ConfigFile, AuthState } from "./types";
import { readJsonFile, writeJsonFile } from "./fs";

const resolveConfigDir = () =>
  process.env.GETROUTER_CONFIG_DIR ||
  path.join(require("node:os").homedir(), ".getrouter");

const getConfigPath = () => path.join(resolveConfigDir(), "config.json");
const getAuthPath = () => path.join(resolveConfigDir(), "auth.json");

export const readConfig = (): ConfigFile => ({
  ...defaultConfig(),
  ...(readJsonFile<ConfigFile>(getConfigPath()) ?? {}),
});

export const writeConfig = (cfg: ConfigFile) => writeJsonFile(getConfigPath(), cfg);

export const readAuth = (): AuthState => ({
  ...defaultAuthState(),
  ...(readJsonFile<AuthState>(getAuthPath()) ?? {}),
});

export const writeAuth = (auth: AuthState) => writeJsonFile(getAuthPath(), auth);
```

**Step 4: Run tests to verify they pass**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/config/index.ts tests/config/index.test.ts
git commit -m "feat: add config/auth read write helpers"
```

---

### Task 4: Redaction Utility (TDD)

**Files:**
- Create: `src/core/config/redact.ts`
- Test: `tests/config/redact.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { redactSecrets } from "../../src/core/config/redact";

describe("redact", () => {
  it("redacts known secret fields", () => {
    const out = redactSecrets({
      accessToken: "secret",
      refreshToken: "secret2",
      apiKey: "key",
      other: "ok",
    });
    expect(out.accessToken).toBe("****");
    expect(out.refreshToken).toBe("****");
    expect(out.apiKey).toBe("****");
    expect(out.other).toBe("ok");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal redaction**

```ts
const SECRET_KEYS = new Set(["accessToken", "refreshToken", "apiKey"]);

export const redactSecrets = <T extends Record<string, any>>(obj: T): T => {
  const out = { ...obj } as T;
  for (const key of Object.keys(out)) {
    if (SECRET_KEYS.has(key)) {
      out[key] = "****";
    }
  }
  return out;
};
```

**Step 4: Run tests to verify they pass**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/config/redact.ts tests/config/redact.test.ts
git commit -m "feat: add secret redaction helper"
```
