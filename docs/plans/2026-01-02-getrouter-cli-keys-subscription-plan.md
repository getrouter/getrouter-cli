# Keys & Subscription Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement keys (consumer) and subscription commands backed by the dashboard generated TypeScript client, with default redaction and JSON output support.

**Architecture:** Add a `core/api` adapter that wires generated clients to `core/http.requestJson`, then update `cmd/keys` and `cmd/subscription` to call that adapter and format outputs with redaction and `--json`/`--show-secret` flags.

**Tech Stack:** TypeScript, Node.js, commander, vitest.

### Task 1: Add dashboard client adapter

**Files:**
- Create: `src/core/api/client.ts`
- Create: `tests/core/api/client.test.ts`

**Step 1: Write the failing test**

Create `tests/core/api/client.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createApiClients } from "../../../src/core/api/client";

// Minimal fake fetch to capture request details
const makeFetch = () =>
  vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ url, init }),
    } as Response;
  });

describe("api client adapter", () => {
  it("uses requestJson with generated paths", async () => {
    const fetchImpl = makeFetch();
    const { consumerService } = createApiClients({ fetchImpl });
    const res = await consumerService.ListConsumers({
      pageSize: 0,
      pageToken: "",
    });
    expect((res as any).url).toContain("/v1/dashboard/consumers");
    expect((res as any).init.method).toBe("GET");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/api/client.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

Create `src/core/api/client.ts`:

```ts
import { requestJson } from "../http/request";
import {
  createConsumerServiceClient,
  createSubscriptionServiceClient,
} from "../../generated/router/dashboard/v1";

export const createApiClients = ({ fetchImpl }: { fetchImpl?: typeof fetch }) => {
  const handler = async (
    { path, method, body }: { path: string; method: string; body: string | null },
  ) => {
    return requestJson({
      path,
      method,
      body: body ? JSON.parse(body) : undefined,
      fetchImpl,
    });
  };

  return {
    consumerService: createConsumerServiceClient(handler as any),
    subscriptionService: createSubscriptionServiceClient(handler as any),
  };
};
```

**Note:** replace import path with the actual generated client path when wired into CLI (see Task 2).

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/api/client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/api/client.ts tests/core/api/client.test.ts
git commit -m "feat: add api client adapter"
```

### Task 2: Wire generated dashboard client into repo

**Files:**
- Create: `src/generated/router/dashboard/v1/index.ts`
- Modify: `package.json` (if needed for path aliases)

**Step 1: Write the failing test**

Update `tests/core/api/client.test.ts` import path to the actual generated file (if not already) so it fails without the file.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/core/api/client.test.ts`  
Expected: FAIL (missing generated module)

**Step 3: Write minimal implementation**

Copy the generated file from dashboard repo:

```bash
cp /Users/xus/code/github/getrouter/router/frontend/dashboard/src/services/router/dashboard/v1/index.ts \
  src/generated/router/dashboard/v1/index.ts
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/core/api/client.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/generated/router/dashboard/v1/index.ts
git commit -m "chore: import generated dashboard client"
```

### Task 3: Implement keys commands

**Files:**
- Modify: `src/cmd/keys.ts`
- Create: `tests/cmd/keys.test.ts`

**Step 1: Write the failing tests**

Create `tests/cmd/keys.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createProgram } from "../../src/cli";
import * as api from "../../src/core/api/client";

vi.mock("../../src/core/api/client");

const mockConsumer = {
  id: "c1",
  name: "dev",
  enabled: true,
  apiKey: "abcd1234WXYZ",
  lastAccess: "2026-01-02T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("keys commands", () => {
  it("list outputs redacted apiKey", async () => {
    vi.spyOn(api, "createApiClients").mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
      },
      subscriptionService: {} as any,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "list", "--json"]);
    const payload = JSON.parse(log.mock.calls[0][0]);
    expect(payload.consumers[0].apiKey).toBe("abcd...WXYZ");
    log.mockRestore();
  });

  it("update requires at least one field", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "getrouter", "keys", "update", "c1"])
    ).rejects.toThrow();
    log.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`  
Expected: FAIL (commands not implemented)

**Step 3: Write minimal implementation**

Update `src/cmd/keys.ts` to:
- create `createApiClients()` per command
- map commands to `consumerService` methods
- apply redaction unless `--show-secret`
- `keys update` builds `updateMask` from provided fields
- `keys create` accepts `--name` and `--enabled`

Suggested outline:

```ts
import { Command } from "commander";
import { readConfig } from "../core/config";
import { redactSecrets } from "../core/config/redact";
import { createApiClients } from "../core/api/client";

const shouldJson = (jsonFlag?: boolean) =>
  typeof jsonFlag === "boolean" ? jsonFlag : readConfig().json;

const output = (payload: unknown, json: boolean) => {
  if (json) return console.log(JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
};
```

Ensure list output wraps as `{ consumers }` in JSON mode.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cmd/keys.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: implement keys commands"
```

### Task 4: Implement subscription show command

**Files:**
- Modify: `src/cmd/subscription.ts`
- Create: `tests/cmd/subscription.test.ts`

**Step 1: Write the failing tests**

Create `tests/cmd/subscription.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createProgram } from "../../src/cli";
import * as api from "../../src/core/api/client";

vi.mock("../../src/core/api/client");

const mockSubscription = {
  status: "ACTIVE",
  startAt: "2026-01-01T00:00:00Z",
  endAt: "2026-02-01T00:00:00Z",
  plan: { name: "Pro", requestPerMinute: 20, tokenPerMinute: "150K" },
};

describe("subscription command", () => {
  it("shows current subscription", async () => {
    vi.spyOn(api, "createApiClients").mockReturnValue({
      subscriptionService: {
        CurrentSubscription: vi.fn().mockResolvedValue(mockSubscription),
      },
      consumerService: {} as any,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "subscription", "show", "--json"]);
    const payload = JSON.parse(log.mock.calls[0][0]);
    expect(payload.status).toBe("ACTIVE");
    log.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/subscription.test.ts`  
Expected: FAIL (not implemented)

**Step 3: Write minimal implementation**

Update `src/cmd/subscription.ts` to call `subscriptionService.CurrentSubscription({})` and format output. For default output, print key fields; for `--json` output print full object.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cmd/subscription.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/subscription.ts tests/cmd/subscription.test.ts
git commit -m "feat: implement subscription show"
```

---

Plan complete and saved to `docs/plans/2026-01-02-getrouter-cli-keys-subscription-plan.md`.

Two execution options:

1. Subagent-Driven (this session) — use superpowers:subagent-driven-development
2. Parallel Session (separate) — open a new session with executing-plans in this worktree

Which approach?
