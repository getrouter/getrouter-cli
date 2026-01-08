# getrouter CLI Keys get Table Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change `keys get <id>` default output to a single-row table matching `keys list` while keeping JSON output unchanged.

**Architecture:** Reuse the existing table renderer by adding a shared row/headers helper for consumers, then route `keys get` non-JSON output through the table path without altering create/update behavior.

**Tech Stack:** TypeScript, Commander, Vitest.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing test for `keys get` default table output

**Files:**
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Write the failing test**

```ts
it("get prints table header and redacts apiKey in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      GetConsumer: vi.fn().mockResolvedValue(mockConsumer),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys", "get", "c1"]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  expect(output).toContain("NAME");
  expect(output).toContain("ENABLED");
  expect(output).toContain("LAST_ACCESS");
  expect(output).toContain("CREATED_AT");
  expect(output).toContain("API_KEY");
  expect(output).toContain("abcd...WXYZ");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: FAIL because `keys get` currently prints key=value lines instead of a table.

**Step 3: Commit the failing test**

```bash
git add tests/cmd/keys.test.ts
git commit -m "test: cover keys get table output"
```

### Task 2: Render `keys get` with table output

**Files:**
- Modify: `src/cmd/keys.ts`
- Test: `tests/cmd/keys.test.ts`

**Step 1: Implement shared headers/row helper**

```ts
const consumerHeaders = [
  "ID",
  "NAME",
  "ENABLED",
  "LAST_ACCESS",
  "CREATED_AT",
  "API_KEY",
];

const consumerRow = (consumer: any) => [
  String(consumer.id ?? ""),
  String(consumer.name ?? ""),
  String(consumer.enabled ?? ""),
  String(consumer.lastAccess ?? ""),
  String(consumer.createdAt ?? ""),
  String(consumer.apiKey ?? ""),
];
```

**Step 2: Use table output for `keys get` only**

```ts
const outputConsumerTable = (consumer: any) =>
  console.log(renderTable(consumerHeaders, [consumerRow(consumer)]));

// In keys get
if (shouldJson(options)) {
  outputConsumer(output, true);
} else {
  outputConsumerTable(output);
}
```

**Step 3: Keep list output using the same helpers**

```ts
const outputConsumers = (consumers: any[], json: boolean) => {
  if (json) {
    console.log(JSON.stringify({ consumers }, null, 2));
    return;
  }
  const rows = consumers.map(consumerRow);
  console.log(renderTable(consumerHeaders, rows));
};
```

**Step 4: Run tests to verify pass**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: render keys get output as table"
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
