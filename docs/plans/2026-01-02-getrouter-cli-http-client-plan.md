# HTTP Client Core Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a reusable HTTP client wrapper that handles base URL building, auth headers, JSON request/response, and error normalization for getrouter CLI.

**Architecture:** Add a `core/http` module with URL building helpers and a `requestJson` function that reads config/auth state and uses `fetch` under the hood. Expose error normalization via a typed `ApiError`.

**Tech Stack:** TypeScript, Node.js fetch, vitest.

---

### Task 1: URL Helpers (TDD)

**Files:**
- Create: `src/core/http/url.ts`
- Test: `tests/http/url.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildApiUrl } from "../../src/core/http/url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("buildApiUrl", () => {
  it("joins base and path safely", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(
      path.join(dir, "config.json"),
      JSON.stringify({ apiBase: "https://getrouter.dev/" })
    );
    expect(buildApiUrl("/v1/test")).toBe("https://getrouter.dev/v1/test");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal helpers**

`src/core/http/url.ts`

```ts
import { readConfig } from "../config";

export const getApiBase = () => {
  const raw = readConfig().apiBase || "";
  return raw.replace(/\\/+$/, "");
};

export const buildApiUrl = (path: string) => {
  const base = getApiBase();
  const normalized = path.replace(/^\\/+/, "");
  return base ? `${base}/${normalized}` : `/${normalized}`;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/http/url.ts tests/http/url.test.ts
git commit -m "feat: add http url helpers"
```

---

### Task 2: API Error Normalization (TDD)

**Files:**
- Create: `src/core/http/errors.ts`
- Test: `tests/http/errors.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createApiError } from "../../src/core/http/errors";

describe("api errors", () => {
  it("normalizes error payload", () => {
    const err = createApiError({ code: "BAD", message: "oops" }, "fallback", 400);
    expect(err.message).toBe("oops");
    expect(err.code).toBe("BAD");
    expect(err.status).toBe(400);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal error helper**

```ts
export type ApiError = {
  code?: string;
  message: string;
  details?: unknown;
  status?: number;
};

export const createApiError = (payload: any, fallbackMessage: string, status?: number) => {
  const message =
    payload && typeof payload.message === "string" ? payload.message : fallbackMessage;
  const err = new Error(message) as Error & ApiError;
  if (payload && typeof payload.code === "string") err.code = payload.code;
  if (payload && payload.details != null) err.details = payload.details;
  if (typeof status === "number") err.status = status;
  return err;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/http/errors.ts tests/http/errors.test.ts
git commit -m "feat: add api error normalization"
```

---

### Task 3: Request Wrapper (TDD)

**Files:**
- Create: `src/core/http/request.ts`
- Test: `tests/http/request.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { requestJson } from "../../src/core/http/request";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("requestJson", () => {
  it("adds Authorization when token exists", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));
    process.env.GETROUTER_CONFIG_DIR = dir;
    fs.writeFileSync(path.join(dir, "auth.json"), JSON.stringify({ accessToken: "t" }));

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }));

    const res = await requestJson({
      path: "/v1/test",
      method: "GET",
      fetchImpl: fetchSpy as any,
    });

    expect(res.ok).toBe(true);
    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer t");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Implement minimal request wrapper**

```ts
import { buildApiUrl } from "./url";
import { readAuth } from "../config";
import { createApiError } from "./errors";

type RequestInput = {
  path: string;
  method: string;
  body?: unknown;
  fetchImpl?: typeof fetch;
};

export const requestJson = async <T = unknown>({
  path,
  method,
  body,
  fetchImpl,
}: RequestInput): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = readAuth();
  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  const res = await (fetchImpl ?? fetch)(buildApiUrl(path), {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw createApiError(payload, res.statusText, res.status);
  }
  return (await res.json()) as T;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/http/request.ts tests/http/request.test.ts
git commit -m "feat: add http request wrapper"
```
