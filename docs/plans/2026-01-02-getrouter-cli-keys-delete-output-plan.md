# Keys Delete Table Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change `keys delete` default output to the standard keys table while keeping JSON output unchanged.

**Architecture:** Reuse the existing keys table helpers in `cmd/keys` and render a single-row table with only `id` populated. Preserve `{ deleted: true, id }` for `--json` output.

**Tech Stack:** TypeScript, Commander, Vitest.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add failing tests for delete table output

**Files:**
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Write the failing tests**

```ts
it("delete prints table header and id in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      DeleteConsumer: vi.fn().mockResolvedValue({}),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys", "delete", "c1"]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  expect(output).toContain("API_KEY");
  expect(output).toContain("c1");
  log.mockRestore();
});

it("delete outputs json when --json is set", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      DeleteConsumer: vi.fn().mockResolvedValue({}),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync([
    "node",
    "getrouter",
    "keys",
    "delete",
    "c1",
    "--json",
  ]);
  const payload = JSON.parse(log.mock.calls[0][0]);
  expect(payload.deleted).toBe(true);
  expect(payload.id).toBe("c1");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: FAIL because delete currently prints key=value lines.

**Step 3: Commit the failing tests**

```bash
git add tests/cmd/keys.test.ts
git commit -m "test: cover keys delete table output"
```

### Task 2: Render delete output using table helper

**Files:**
- Modify: `src/cmd/keys.ts`
- Test: `tests/cmd/keys.test.ts`

**Step 1: Route non-JSON delete output to table renderer**

```ts
// In delete
if (shouldJson(options)) {
  console.log(JSON.stringify({ deleted: true, id }, null, 2));
} else {
  outputConsumerTable({ id });
}
```

**Step 2: Run tests to verify pass**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: render keys delete output as table"
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
