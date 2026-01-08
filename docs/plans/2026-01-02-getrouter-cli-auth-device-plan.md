# Device Auth Login Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder OAuth login with device-style login (auth_code + browser + polling authorize) and persist tokens in auth.json.

**Architecture:** Add a `core/auth/device` helper for auth_code generation, login URL, browser open, and polling with backoff/timeout. Wire `auth login` to use `authService.Authorize` and write tokens. Extend API client to include AuthService and refresh the generated dashboard client. Update auth status note to reflect real login.

**Tech Stack:** TypeScript, Commander, Vitest, Node `crypto`/`child_process`.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing tests for device login

**Files:**
- Modify: `tests/cmd/auth.test.ts`
- Add: `tests/auth/device.test.ts`
- Modify: `tests/auth/status.test.ts`

**Step 1: Update auth command tests (failing)**

Replace the placeholder login test with device login expectations:

```ts
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import {
  generateAuthCode,
  openLoginUrl,
  pollAuthorize,
  buildLoginUrl,
} from "../../src/core/auth/device";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

vi.mock("../../src/core/auth/device", async () => {
  const actual = await vi.importActual<typeof import("../../src/core/auth/device")>(
    "../../src/core/auth/device"
  );
  return {
    ...actual,
    generateAuthCode: vi.fn(() => "abcde234567fg"),
    openLoginUrl: vi.fn(async () => {}),
    pollAuthorize: vi.fn(),
  };
});

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

it("login polls authorize and writes auth.json", async () => {
  const dir = makeDir();
  process.env.GETROUTER_CONFIG_DIR = dir;
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    authService: { Authorize: vi.fn() },
    consumerService: {} as any,
    subscriptionService: {} as any,
  });
  (pollAuthorize as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: "2026-01-03T00:00:00Z",
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "auth", "login"]);
  const saved = JSON.parse(
    fs.readFileSync(path.join(dir, "auth.json"), "utf-8")
  );
  expect(saved.accessToken).toBe("access");
  expect(saved.refreshToken).toBe("refresh");
  expect(saved.tokenType).toBe("Bearer");
  expect(openLoginUrl).toHaveBeenCalledWith(
    buildLoginUrl((generateAuthCode as unknown as ReturnType<typeof vi.fn>).mock.results[0].value)
  );
  log.mockRestore();
});
```

**Step 2: Add device auth polling tests (failing)**

```ts
import { describe, it, expect, vi } from "vitest";
import { pollAuthorize, generateAuthCode } from "../../src/core/auth/device";

const makeErr = (status: number) => Object.assign(new Error("err"), { status });

it("polls until authorize succeeds", async () => {
  const authorize = vi
    .fn()
    .mockRejectedValueOnce(makeErr(404))
    .mockResolvedValue({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "2026-01-03T00:00:00Z",
    });
  let now = 0;
  const res = await pollAuthorize({
    authorize,
    code: "abc",
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
    initialDelayMs: 1,
    maxDelayMs: 2,
    timeoutMs: 100,
  });
  expect(res.accessToken).toBe("a");
  expect(authorize).toHaveBeenCalledTimes(2);
});

it("fails on 400/403", async () => {
  await expect(
    pollAuthorize({
      authorize: vi.fn().mockRejectedValue(makeErr(400)),
      code: "abc",
      sleep: async () => {},
      now: () => 0,
      timeoutMs: 10,
    })
  ).rejects.toThrow("登录码已被使用");
  await expect(
    pollAuthorize({
      authorize: vi.fn().mockRejectedValue(makeErr(403)),
      code: "abc",
      sleep: async () => {},
      now: () => 0,
      timeoutMs: 10,
    })
  ).rejects.toThrow("登录码已过期");
});

it("times out after deadline", async () => {
  const authorize = vi.fn().mockRejectedValue(makeErr(404));
  let now = 0;
  await expect(
    pollAuthorize({
      authorize,
      code: "abc",
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      initialDelayMs: 5,
      maxDelayMs: 5,
      timeoutMs: 6,
    })
  ).rejects.toThrow("登录超时");
});

it("generates 13-char base32 auth code", () => {
  const code = generateAuthCode();
  expect(code).toMatch(/^[a-z2-7]{13}$/);
});
```

**Step 3: Update auth status test expectation (failing)**

```ts
const status = getAuthStatus();
expect(status.status).toBe("logged_in");
expect(status.note).toBeUndefined();
```

**Step 4: Run tests to verify they fail**

Run: `npm test -- tests/cmd/auth.test.ts tests/auth/device.test.ts tests/auth/status.test.ts`
Expected: FAIL (device auth not implemented, module missing).

**Step 5: Commit failing tests**

```bash
git add tests/cmd/auth.test.ts tests/auth/device.test.ts tests/auth/status.test.ts
git commit -m "test: add device auth login coverage"
```

### Task 2: Implement device auth helpers and update auth status

**Files:**
- Create: `src/core/auth/device.ts`
- Modify: `src/core/auth/index.ts`

**Step 1: Implement device helpers**

```ts
import { randomInt } from "node:crypto";
import { spawn } from "node:child_process";

type AuthToken = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  expiresAt: string | undefined;
};

type AuthorizeFn = (req: { code: string }) => Promise<AuthToken>;

type PollOptions = {
  authorize: AuthorizeFn;
  code: string;
  timeoutMs?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onRetry?: (attempt: number, delayMs: number) => void;
};

const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export const generateAuthCode = () => {
  let out = "";
  for (let i = 0; i < 13; i += 1) {
    out += alphabet[randomInt(32)];
  }
  return out;
};

export const buildLoginUrl = (authCode: string) =>
  `https://getrouter.dev/auth/${authCode}`;

export const openLoginUrl = async (url: string) => {
  try {
    if (process.platform === "darwin") {
      const child = spawn("open", [url], { stdio: "ignore", detached: true });
      child.unref();
      return;
    }
    if (process.platform === "win32") {
      const child = spawn("cmd", ["/c", "start", "", url], {
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      return;
    }
    const child = spawn("xdg-open", [url], { stdio: "ignore", detached: true });
    child.unref();
  } catch {
    // best effort
  }
};

export const pollAuthorize = async ({
  authorize,
  code,
  timeoutMs = 5 * 60 * 1000,
  initialDelayMs = 1000,
  maxDelayMs = 10000,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  now = () => Date.now(),
  onRetry,
}: PollOptions) => {
  const start = now();
  let delay = initialDelayMs;
  let attempt = 0;
  while (true) {
    try {
      return await authorize({ code });
    } catch (err: any) {
      const status = err?.status;
      if (status === 404) {
        // keep polling
      } else if (status === 400) {
        throw new Error("登录码已被使用，请重新登录。");
      } else if (status === 403) {
        throw new Error("登录码已过期，请重新登录。");
      } else {
        throw err;
      }
    }
    if (now() - start >= timeoutMs) {
      throw new Error("登录超时，请重新执行 getrouter auth login。");
    }
    attempt += 1;
    onRetry?.(attempt, delay);
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
};
```

**Step 2: Update auth status note**

Remove the “远端验证待开放” note when logged in:

```ts
return {
  status: "logged_in",
  expiresAt: auth.expiresAt,
  accessToken: auth.accessToken,
  refreshToken: auth.refreshToken,
  tokenType: auth.tokenType,
};
```

**Step 3: Run tests to verify they still fail**

Run: `npm test -- tests/auth/device.test.ts tests/auth/status.test.ts`
Expected: PASS for new unit tests, but `auth login` test still FAIL (cmd not wired yet).

**Step 4: Commit helper implementation**

```bash
git add src/core/auth/device.ts src/core/auth/index.ts tests/auth/device.test.ts tests/auth/status.test.ts
git commit -m "feat: add device auth helpers"
```

### Task 3: Wire auth login to device flow and update API client

**Files:**
- Modify: `src/cmd/auth.ts`
- Modify: `src/core/api/client.ts`
- Modify: `tests/cmd/auth.test.ts`
- Modify: `tests/core/api/client.test.ts`
- Modify: `src/generated/router/dashboard/v1/index.ts`

**Step 1: Refresh generated dashboard client**

Copy latest generated file that includes `AuthService.Authorize`:

```bash
cp /Users/xus/code/github/getrouter/router/frontend/dashboard/src/services/router/dashboard/v1/index.ts \
  src/generated/router/dashboard/v1/index.ts
```

**Step 2: Extend API client adapter to include authService**

```ts
import { createAuthServiceClient } from "../../generated/router/dashboard/v1";

// add to ClientFactories
createAuthServiceClient: (handler: RequestHandler) => unknown;

// in factories default
createAuthServiceClient,

// in return value
authService: factories.createAuthServiceClient(handler) as any,
```

Update `tests/core/api/client.test.ts` fakeClients to include `createAuthServiceClient: (_handler) => ({})`.

**Step 3: Implement device login in cmd/auth**

```ts
import { writeAuth } from "../core/config";
import { createApiClients } from "../core/api/client";
import {
  generateAuthCode,
  buildLoginUrl,
  openLoginUrl,
  pollAuthorize,
} from "../core/auth/device";

.auth.command("login")
  .description("Login with device flow")
  .action(async () => {
    const { authService } = createApiClients({});
    const authCode = generateAuthCode();
    const url = buildLoginUrl(authCode);
    console.log("To authenticate, visit:");
    console.log(url);
    console.log("Waiting for confirmation...");
    void openLoginUrl(url);
    const token = await pollAuthorize({
      authorize: authService.Authorize.bind(authService),
      code: authCode,
      onRetry: () => {},
    });
    writeAuth({
      accessToken: token.accessToken ?? "",
      refreshToken: token.refreshToken ?? "",
      expiresAt: token.expiresAt ?? "",
      tokenType: "Bearer",
    });
    console.log("登录成功");
  });
```

**Step 4: Run tests to verify pass**

Run: `npm test -- tests/cmd/auth.test.ts tests/core/api/client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/auth.ts src/core/api/client.ts src/generated/router/dashboard/v1/index.ts tests/cmd/auth.test.ts tests/core/api/client.test.ts
git commit -m "feat: implement device auth login"
```

### Task 4: Full test run

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 2: Commit (if needed)**

```bash
git status -sb
```

If clean, no commit needed.
