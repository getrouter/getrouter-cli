# Auth Placeholder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement placeholder `auth login/logout/status` behavior with local-only auth state handling, including token masking and secure auth file permissions.

**Architecture:** Add a small `core/auth` module for status/clear logic, extend auth storage schema with `tokenType`, enforce `0600` for `auth.json` on *nix, and update CLI `auth` commands to use these helpers. Output supports `--json` and redacts secrets by default.

**Tech Stack:** TypeScript, Node.js `fs/os/path`, commander, vitest.

### Task 1: Extend auth schema and enforce auth.json permissions

**Files:**
- Modify: `src/core/config/types.ts`
- Modify: `src/core/config/index.ts`
- Modify: `tests/config/index.test.ts`

**Step 1: Write the failing tests**

Add to `tests/config/index.test.ts`:

```ts
it("defaults tokenType to Bearer", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
  process.env.GETROUTER_CONFIG_DIR = dir;
  writeAuth({ accessToken: "a", refreshToken: "b", expiresAt: "c", tokenType: "Bearer" });
  const auth = readAuth();
  expect(auth.tokenType).toBe("Bearer");
});

it("writes auth file with 0600 on unix", () => {
  if (process.platform === "win32") return;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
  process.env.GETROUTER_CONFIG_DIR = dir;
  writeAuth({ accessToken: "a", refreshToken: "b", expiresAt: "c", tokenType: "Bearer" });
  const mode = fs.statSync(path.join(dir, "auth.json")).mode & 0o777;
  expect(mode).toBe(0o600);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/index.test.ts`  
Expected: FAIL (missing tokenType default and chmod)

**Step 3: Write minimal implementation**

Update `src/core/config/types.ts`:

```ts
export type AuthState = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
};

export const defaultAuthState = (): AuthState => ({
  accessToken: "",
  refreshToken: "",
  expiresAt: "",
  tokenType: "Bearer",
});
```

Update `src/core/config/index.ts` (after `writeJsonFile`):

```ts
import fs from "node:fs";

export const writeAuth = (auth: AuthState) => {
  writeJsonFile(getAuthPath(), auth);
  if (process.platform !== "win32") {
    fs.chmodSync(getAuthPath(), 0o600);
  }
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/config/index.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/config/types.ts src/core/config/index.ts tests/config/index.test.ts
git commit -m "feat: extend auth schema and secure auth file"
```

### Task 2: Mask secrets by default

**Files:**
- Modify: `src/core/config/redact.ts`
- Modify: `tests/config/redact.test.ts`

**Step 1: Write the failing test**

Update `tests/config/redact.test.ts`:

```ts
expect(out.accessToken).toBe("secr...cret");
expect(out.refreshToken).toBe("secr...ret2");
expect(out.apiKey).toBe("key...");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/redact.test.ts`  
Expected: FAIL (currently uses "****")

**Step 3: Write minimal implementation**

Update `src/core/config/redact.ts`:

```ts
const mask = (value: string) => {
  if (!value) return "";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export const redactSecrets = <T extends Record<string, any>>(obj: T): T => {
  const out = { ...obj } as T;
  for (const key of Object.keys(out)) {
    if (SECRET_KEYS.has(key) && typeof out[key] === "string") {
      out[key] = mask(out[key]);
    }
  }
  return out;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/config/redact.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/config/redact.ts tests/config/redact.test.ts
git commit -m "feat: mask secrets in outputs"
```

### Task 3: Add core/auth status + clear helpers

**Files:**
- Create: `src/core/auth/index.ts`
- Create: `tests/auth/status.test.ts`

**Step 1: Write the failing tests**

Create `tests/auth/status.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAuth, readAuth } from "../../src/core/config";
import { getAuthStatus, clearAuth } from "../../src/core/auth";

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
    expect(status.note).toContain("远端验证待开放");
    vi.useRealTimers();
  });

  it("clears auth state", () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({ accessToken: "a", refreshToken: "b", expiresAt: "c", tokenType: "Bearer" });
    clearAuth();
    const auth = readAuth();
    expect(auth.accessToken).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth/status.test.ts`  
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

Create `src/core/auth/index.ts`:

```ts
import { readAuth, writeAuth } from "../config";
import { defaultAuthState } from "../config/types";

type AuthStatus = {
  status: "logged_in" | "logged_out";
  note?: string;
  expiresAt?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
};

const isExpired = (expiresAt: string) => {
  if (!expiresAt) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
};

export const getAuthStatus = (): AuthStatus => {
  const auth = readAuth();
  const hasTokens = Boolean(auth.accessToken && auth.refreshToken);
  if (!hasTokens || isExpired(auth.expiresAt)) {
    return { status: "logged_out" };
  }
  return {
    status: "logged_in",
    note: "仅本地验证，远端验证待开放",
    expiresAt: auth.expiresAt,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    tokenType: auth.tokenType,
  };
};

export const clearAuth = () => {
  writeAuth(defaultAuthState());
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/auth/status.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/auth/index.ts tests/auth/status.test.ts
git commit -m "feat: add core auth status helpers"
```

### Task 4: Implement auth CLI commands

**Files:**
- Modify: `src/cmd/auth.ts`
- Create: `tests/cmd/auth.test.ts`

**Step 1: Write the failing tests**

Create `tests/cmd/auth.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProgram } from "../../src/cli";
import { writeAuth } from "../../src/core/config";

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

describe("auth commands", () => {
  it("login prints placeholder and does not write auth", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "auth", "login"]);
    expect(log.mock.calls[0][0]).toContain("OAuth");
    expect(fs.existsSync(path.join(dir, "auth.json"))).toBe(false);
    log.mockRestore();
  });

  it("status outputs json with redacted tokens", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "abcd1234WXYZ",
      refreshToken: "refreshtokenVALUE",
      expiresAt: "2026-01-03T00:00:00Z",
      tokenType: "Bearer",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "auth", "status", "--json"]);
    const payload = JSON.parse(log.mock.calls[0][0]);
    expect(payload.status).toBe("logged_in");
    expect(payload.accessToken).toBe("abcd...WXYZ");
    log.mockRestore();
  });

  it("logout clears local auth", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({ accessToken: "a", refreshToken: "b", expiresAt: "c", tokenType: "Bearer" });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "auth", "logout"]);
    expect(log.mock.calls[0][0]).toContain("已清除");
    log.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/auth.test.ts`  
Expected: FAIL (auth handlers missing)

**Step 3: Write minimal implementation**

Update `src/cmd/auth.ts`:

```ts
import { Command } from "commander";
import { readConfig } from "../core/config";
import { getAuthStatus, clearAuth } from "../core/auth";
import { redactSecrets } from "../core/config/redact";

type AuthOptions = { json?: boolean; showSecret?: boolean };

const shouldJson = (options: AuthOptions) =>
  typeof options.json === "boolean" ? options.json : readConfig().json;

const output = (payload: Record<string, unknown>, json: boolean) => {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  for (const [key, value] of Object.entries(payload)) {
    if (value == null || value === "") continue;
    console.log(`${key}=${value}`);
  }
};

export const registerAuthCommands = (program: Command) => {
  const auth = program.command("auth").description("Authentication");

  auth
    .command("login")
    .description("Login with GitHub OAuth")
    .action(() => {
      console.log("getrouter OAuth 仍在开发中，暂不支持登录。");
    });

  auth
    .command("logout")
    .description("Clear local auth state")
    .action(() => {
      clearAuth();
      console.log("已清除本地认证信息。");
    });

  auth
    .command("status")
    .description("Show current auth status")
    .option("--json", "Output JSON")
    .option("--show-secret", "Show full secrets")
    .action((options: AuthOptions) => {
      const status = getAuthStatus();
      const payload: Record<string, unknown> = {
        status: status.status,
        note: status.note,
        expiresAt: status.expiresAt,
        accessToken: status.accessToken,
        refreshToken: status.refreshToken,
        tokenType: status.tokenType,
      };
      const json = shouldJson(options);
      const outputPayload = options.showSecret ? payload : redactSecrets(payload);
      output(outputPayload, json);
    });
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cmd/auth.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/auth.ts tests/cmd/auth.test.ts
git commit -m "feat: implement auth placeholder commands"
```

---

Plan complete and saved to `docs/plans/2026-01-02-getrouter-cli-auth-plan.md`.

Two execution options:

1. Subagent-Driven (this session) — use superpowers:subagent-driven-development
2. Parallel Session (separate) — open a new session in this worktree and use superpowers:executing-plans

Which approach?
