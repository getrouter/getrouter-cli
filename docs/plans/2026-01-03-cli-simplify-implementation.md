# CLI Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace existing multi-level commands with simplified top-level commands (login/logout/keys/usages/status/codex/claude/config), add usage aggregation + chart output, and remove deprecated commands.

**Architecture:** Introduce new command modules for usages/status/codex/claude, repurpose keys into an interactive menu, and extend generated API client + request layer to support usage listing. Update output helpers for charts and keep all output human-friendly (no JSON flags). Remove old command registrations and associated tests.

**Tech Stack:** Bun, Commander, Prompts, Vitest, generated TypeScript HTTP clients.

---

### Task 1: Add UsageService to generated client + API client wiring

**Files:**
- Modify: `src/generated/router/dashboard/v1/index.ts`
- Modify: `src/core/api/client.ts`
- Test: `tests/core/api/client.test.ts`

**Step 1: Write failing test for usage client exposure**

Add to `tests/core/api/client.test.ts`:
```ts
expect("usageService" in createApiClients({})).toBe(true);
```

**Step 2: Run targeted test to see failure**

Run:
```bash
bun run test -- tests/core/api/client.test.ts
```
Expected: FAIL (usageService missing).

**Step 3: Update generated client to include UsageService**

Copy the UsageService types/creator from
`/Users/xus/code/github/getrouter/router/frontend/dashboard/src/services/router/dashboard/v1/index.ts`
into `src/generated/router/dashboard/v1/index.ts` (just before the EOF insertion point):
- `ListUsagesRequest`, `ListUsagesResponse`, `routercommonv1_Usage`
- `UsageService` interface
- `createUsageServiceClient` (GET `v1/dashboard/usages`)

**Step 4: Wire usageService into API client**

Update `src/core/api/client.ts` to import/export `UsageService` and include
`usageService` in `ClientFactories`/`ApiClients` and return value.

**Step 5: Re-run targeted test**

Run:
```bash
bun run test -- tests/core/api/client.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/generated/router/dashboard/v1/index.ts src/core/api/client.ts tests/core/api/client.test.ts
git commit -m "feat: add usage service client"
```

---

### Task 2: Usage aggregation + chart rendering helpers

**Files:**
- Create: `src/core/usages/aggregate.ts`
- Create: `src/core/output/usages.ts`
- Test: `tests/core/usages/aggregate.test.ts`
- Test: `tests/output/usages.test.ts`

**Step 1: Write failing tests for aggregation + chart**

`tests/core/usages/aggregate.test.ts` (example):
```ts
import { describe, expect, it } from "vitest";
import { aggregateUsages } from "../../../src/core/usages/aggregate";

describe("aggregateUsages", () => {
  it("groups by local day and totals tokens", () => {
    const rows = [
      { createdAt: "2026-01-03T12:00:00Z", inputTokens: 5, outputTokens: 7, totalTokens: 12 },
      { createdAt: "2026-01-03T18:00:00Z", inputTokens: 3, outputTokens: 2, totalTokens: 5 },
    ];
    const result = aggregateUsages(rows, 7);
    expect(result[0].totalTokens).toBe(17);
    expect(result[0].inputTokens).toBe(8);
    expect(result[0].outputTokens).toBe(9);
  });
});
```

`tests/output/usages.test.ts` (example):
```ts
import { describe, expect, it } from "vitest";
import { renderUsageChart } from "../../../src/core/output/usages";

describe("renderUsageChart", () => {
  it("renders stacked bars", () => {
    const output = renderUsageChart([
      { day: "2026-01-03", inputTokens: 10, outputTokens: 20, totalTokens: 30, requests: 2 },
    ]);
    expect(output).toContain("2026-01-03");
    expect(output).toMatch(/█/);
  });
});
```

**Step 2: Run tests to see failures**

```bash
bun run test -- tests/core/usages/aggregate.test.ts tests/output/usages.test.ts
```
Expected: FAIL (missing modules).

**Step 3: Implement aggregation helper**

`src/core/usages/aggregate.ts` should:
- Accept raw usages and `days` (fixed to 7 for now).
- Convert `createdAt` to **local day string** (`YYYY-MM-DD`).
- Group by day, summing input/output/total and counting requests.
- Return sorted (newest → oldest) list, truncated to 7 unique days.

**Step 4: Implement chart/table renderer**

`src/core/output/usages.ts` should:
- Render stacked bars (input + output) with max width (e.g., 24–30 chars).
- Distinguish input/output segments (different block chars or symbols).
- Provide table rows for date/input/output/total/requests.

**Step 5: Re-run tests**

```bash
bun run test -- tests/core/usages/aggregate.test.ts tests/output/usages.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/core/usages/aggregate.ts src/core/output/usages.ts tests/core/usages/aggregate.test.ts tests/output/usages.test.ts
git commit -m "feat: add usage aggregation and chart output"
```

---

### Task 3: Add `getrouter usages` command

**Files:**
- Create: `src/cmd/usages.ts`
- Modify: `src/cmd/index.ts`
- Test: `tests/cmd/usages.test.ts`

**Step 1: Write failing command test**

`tests/cmd/usages.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";

vi.mock("../../src/core/api/client", () => ({ createApiClients: vi.fn() }));

describe("usages command", () => {
  it("prints chart and table", async () => {
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usageService: { ListUsage: vi.fn().mockResolvedValue({ usages: [] }) },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "usages"]);
    expect(log.mock.calls.length).toBeGreaterThan(0);
    log.mockRestore();
  });
});
```

**Step 2: Run test and observe failure**

```bash
bun run test -- tests/cmd/usages.test.ts
```
Expected: FAIL (command not registered).

**Step 3: Implement command**

`src/cmd/usages.ts`:
- Use `createApiClients().usageService.ListUsage` with pagination.
- Collect rows until 7 unique days found (or pages exhausted).
- Use `aggregateUsages` + `renderUsageChart`/`renderUsageTable`.
- Always print chart + table.

**Step 4: Register command**

In `src/cmd/index.ts`, add `registerUsagesCommand`.

**Step 5: Re-run test**

```bash
bun run test -- tests/cmd/usages.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/cmd/usages.ts src/cmd/index.ts tests/cmd/usages.test.ts
git commit -m "feat: add usages command"
```

---

### Task 4: Simplify login/logout + status command

**Files:**
- Modify: `src/cmd/auth.ts` (or rename to `login.ts` if preferred)
- Create: `src/cmd/status.ts`
- Modify: `src/cmd/index.ts`
- Modify: `tests/cmd/auth.test.ts` → adjust to new command name
- Modify: `tests/cmd/subscription.test.ts` → replace with status tests

**Step 1: Update tests for login/logout**

Change `tests/cmd/auth.test.ts` to call:
- `getrouter login`
- `getrouter logout`

Run:
```bash
bun run test -- tests/cmd/auth.test.ts
```
Expected: FAIL (command not found).

**Step 2: Implement top-level login/logout**

Update `src/cmd/auth.ts` to register commands directly on program:
- `program.command("login")` and `program.command("logout")`
- Same behavior as existing auth login/logout.

**Step 3: Add status command tests**

Create `tests/cmd/status.test.ts` covering:
- Logged-out status output (auth missing)
- Logged-in status output with expiresAt
- Subscription info displayed

**Step 4: Implement status command**

Create `src/cmd/status.ts`:
- Fetch auth status via `getAuthStatus()`
- Fetch subscription via `subscriptionService.CurrentSubscription({})`
- Render combined status output with emoji and alignment

**Step 5: Remove subscription command registration**

Update `src/cmd/index.ts` to stop registering subscription.

**Step 6: Run tests**

```bash
bun run test -- tests/cmd/auth.test.ts tests/cmd/status.test.ts
```
Expected: PASS.

**Step 7: Commit**

```bash
git add src/cmd/auth.ts src/cmd/status.ts src/cmd/index.ts tests/cmd/auth.test.ts tests/cmd/status.test.ts
git commit -m "feat: add login/logout and status commands"
```

---

### Task 5: Keys interactive menu

**Files:**
- Modify: `src/cmd/keys.ts`
- Modify: `src/core/interactive/keys.ts` (menu helpers)
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Update tests to use menu flow**

Adjust `tests/cmd/keys.test.ts` to call `getrouter keys` with prompts injection for:
- list
- get
- create
- update
- delete

Run:
```bash
bun run test -- tests/cmd/keys.test.ts
```
Expected: FAIL (menu not implemented).

**Step 2: Implement menu helper**

Extend `src/core/interactive/keys.ts` with a menu prompt that returns selected action.

**Step 3: Refactor keys command**

Update `src/cmd/keys.ts`:
- Replace subcommands with a single `.command("keys")` that loops menu.
- Use existing list/get/create/update/delete logic internally.
- Confirm delete via y/N prompt.

**Step 4: Re-run tests**

```bash
bun run test -- tests/cmd/keys.test.ts
```
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cmd/keys.ts src/core/interactive/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: add interactive keys menu"
```

---

### Task 6: codex/claude commands (replace setup env)

**Files:**
- Modify: `src/core/setup/env.ts`
- Create: `src/cmd/codex.ts`
- Create: `src/cmd/claude.ts`
- Modify: `src/cmd/index.ts`
- Remove: `src/cmd/setup.ts`
- Modify: `tests/cmd/setup.test.ts` → replace with codex/claude tests

**Step 1: Add failing tests**

Create `tests/cmd/codex.test.ts` + `tests/cmd/claude.test.ts` to verify:
- env file writing with correct variables only
- `--install` triggers rc append
- immediate `process.env` update (assert within command)

Run:
```bash
bun run test -- tests/cmd/codex.test.ts tests/cmd/claude.test.ts
```
Expected: FAIL.

**Step 2: Update env helpers**

In `src/core/setup/env.ts`, add helpers to build provider-specific env (only OpenAI or only Anthropic). Reuse existing render logic.

**Step 3: Implement codex/claude commands**

Each command:
- Select key (interactive if missing)
- Render provider-specific env
- Write env file
- If `--install`: append to rc, set `process.env`, and attempt to `source`/`. <path>` (best-effort)

**Step 4: Remove setup env**

Stop registering setup, delete file + tests.

**Step 5: Re-run tests**

```bash
bun run test -- tests/cmd/codex.test.ts tests/cmd/claude.test.ts
```
Expected: PASS.

**Step 6: Commit**

```bash
git add src/core/setup/env.ts src/cmd/codex.ts src/cmd/claude.ts src/cmd/index.ts tests/cmd/codex.test.ts tests/cmd/claude.test.ts
git rm src/cmd/setup.ts tests/cmd/setup.test.ts
git commit -m "feat: add codex/claude env commands"
```

---

### Task 7: Simplify config command

**Files:**
- Modify: `src/cmd/config.ts`
- Modify: `tests/cmd/config.test.ts`

**Step 1: Update tests**

Adjust `tests/cmd/config.test.ts` to call:
- `getrouter config`
- `getrouter config apiBase https://...`

Run:
```bash
bun run test -- tests/cmd/config.test.ts
```
Expected: FAIL.

**Step 2: Implement simplified command**

Update command to:
- No subcommands
- No `--json`
- Show all config by default

**Step 3: Re-run test**

```bash
bun run test -- tests/cmd/config.test.ts
```
Expected: PASS.

**Step 4: Commit**

```bash
git add src/cmd/config.ts tests/cmd/config.test.ts
git commit -m "feat: simplify config command"
```

---

### Task 8: Update command registration + docs

**Files:**
- Modify: `src/cmd/index.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Update command registration**

Ensure only: login/logout/keys/usages/status/codex/claude/config registered.

**Step 2: Update docs**

Adjust README quick start + command list to new UX. Update AGENTS command list to match.

**Step 3: Run full test suite**

```bash
bun run test
```
Expected: PASS.

**Step 4: Commit**

```bash
git add src/cmd/index.ts README.md AGENTS.md
git commit -m "docs: update command list"
```

---

### Task 9: Final verification

**Step 1: Run format + tests**

```bash
bun run format
bun run test
```
Expected: PASS.

**Step 2: Final commit if needed**

```bash
git status -sb
```
Ensure clean.
