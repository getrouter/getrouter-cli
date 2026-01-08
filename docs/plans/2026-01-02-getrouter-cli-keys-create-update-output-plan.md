# Keys Create/Update Table Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change `keys create` and `keys update` default output to a single-row table matching `keys list/get`, while keeping JSON output unchanged and preserving the create reminder line.

**Architecture:** Reuse the existing consumer table helper in `cmd/keys` and route non-JSON create/update output through that table renderer. Keep `--json` behavior intact and preserve the post-create reminder line.

**Tech Stack:** TypeScript, Commander, Vitest.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing tests for create/update table output

**Files:**
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Write the failing tests**

```ts
it("create prints table header and reminder in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      CreateConsumer: vi.fn().mockResolvedValue(mockConsumer),
      UpdateConsumer: vi.fn().mockResolvedValue(mockConsumer),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync([
    "node",
    "getrouter",
    "keys",
    "create",
    "--name",
    "dev",
  ]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  expect(output).toContain("NAME");
  expect(output).toContain("API_KEY");
  expect(output).toContain("请妥善保存 API Key。");
  log.mockRestore();
});

it("update prints table header in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      UpdateConsumer: vi.fn().mockResolvedValue(mockConsumer),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync([
    "node",
    "getrouter",
    "keys",
    "update",
    "c1",
    "--name",
    "dev",
  ]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  expect(output).toContain("NAME");
  expect(output).toContain("API_KEY");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: FAIL because create/update currently output key=value lines.

**Step 3: Commit the failing tests**

```bash
git add tests/cmd/keys.test.ts
git commit -m "test: cover keys create/update table output"
```

### Task 2: Render create/update output using table helper

**Files:**
- Modify: `src/cmd/keys.ts`
- Test: `tests/cmd/keys.test.ts`

**Step 1: Route non-JSON create/update to table output**

```ts
// In create
if (shouldJson(options)) {
  outputConsumer(output, true);
} else {
  outputConsumerTable(output);
  console.log("请妥善保存 API Key。");
}

// In update
if (shouldJson(options)) {
  outputConsumer(output, true);
} else {
  outputConsumerTable(output);
}
```

**Step 2: Run tests to verify pass**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: render keys create/update output as table"
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
