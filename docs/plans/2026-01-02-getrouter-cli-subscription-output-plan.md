# Subscription Show Table Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change `subscription show` default output to a single-row table while keeping `--json` behavior unchanged and handling unsubscribed responses gracefully.

**Architecture:** Add a table-rendering path in `cmd/subscription` similar to `keys list/get`, reusing `renderTable` with fixed headers and a single row. Preserve JSON output and handle 404/empty responses with a plain “未订阅” message in non-JSON mode.

**Tech Stack:** TypeScript, Commander, Vitest.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing tests for table output and unsubscribed behavior

**Files:**
- Modify: `tests/cmd/subscription.test.ts`

**Step 1: Write the failing tests**

```ts
it("prints table header in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    subscriptionService: {
      CurrentSubscription: vi.fn().mockResolvedValue(mockSubscription),
    },
    consumerService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "subscription", "show"]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("PLAN");
  expect(output).toContain("STATUS");
  expect(output).toContain("START_AT");
  expect(output).toContain("END_AT");
  expect(output).toContain("REQUEST_PER_MINUTE");
  expect(output).toContain("TOKEN_PER_MINUTE");
  log.mockRestore();
});

it("prints 未订阅 when subscription is missing", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    subscriptionService: {
      CurrentSubscription: vi.fn().mockResolvedValue(null),
    },
    consumerService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "subscription", "show"]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("未订阅");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/subscription.test.ts`

Expected: FAIL because default output is currently key=value and no “未订阅” handling.

**Step 3: Commit the failing tests**

```bash
git add tests/cmd/subscription.test.ts
git commit -m "test: cover subscription table output"
```

### Task 2: Render subscription output as table

**Files:**
- Modify: `src/cmd/subscription.ts`
- Test: `tests/cmd/subscription.test.ts`

**Step 1: Add headers/row helpers and table output path**

```ts
import { renderTable } from "../core/output/table";

const subscriptionHeaders = [
  "PLAN",
  "STATUS",
  "START_AT",
  "END_AT",
  "REQUEST_PER_MINUTE",
  "TOKEN_PER_MINUTE",
];

const subscriptionRow = (subscription: any) => [
  String(subscription?.plan?.name ?? ""),
  String(subscription?.status ?? ""),
  String(subscription?.startAt ?? ""),
  String(subscription?.endAt ?? ""),
  String(subscription?.plan?.requestPerMinute ?? ""),
  String(subscription?.plan?.tokenPerMinute ?? ""),
];

const outputSubscriptionTable = (subscription: any) => {
  console.log(renderTable(subscriptionHeaders, [subscriptionRow(subscription)]));
};
```

**Step 2: Handle missing subscription in non-JSON mode**

```ts
if (!subscription) {
  if (json) {
    console.log(JSON.stringify(subscription, null, 2));
  } else {
    console.log("未订阅");
  }
  return;
}
```

**Step 3: Route default output to table renderer**

```ts
if (json) {
  console.log(JSON.stringify(subscription, null, 2));
  return;
}
outputSubscriptionTable(subscription);
```

**Step 4: Run tests to verify pass**

Run: `npm test -- tests/cmd/subscription.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/subscription.ts tests/cmd/subscription.test.ts
git commit -m "feat: render subscription output as table"
```

### Task 3: Full test run

**Files:**
- None

**Step 1: Run full test suite**

Run: `npm test`

Expected: PASS

**Step 2: Commit (if needed)**

```bash
git status -sb
```

If clean, no commit needed.
