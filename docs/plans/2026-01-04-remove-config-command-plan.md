# Remove Config Command Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the `getrouter config` CLI command and keep configuration changes handled via `~/.getrouter/config.json`.

**Architecture:** Delete config command entrypoints and helper parsing, update CLI registration and tests, and remove documentation references.

**Tech Stack:** TypeScript, Commander.js, Vitest.

### Task 1: Add failing tests for config command removal

**Files:**
- Modify: `tests/cli.test.ts`

**Step 1: Write the failing test**

```ts
it("rejects removed config command", async () => {
  const program = createProgram();
  program.exitOverride();
  await expect(
    program.parseAsync(["node", "getrouter", "config"]),
  ).rejects.toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/cli.test.ts`
Expected: FAIL (config command still registered).

**Step 3: Commit**

```bash
git add tests/cli.test.ts
git commit -m "test: remove config command"
```

### Task 2: Remove config command implementation and helpers

**Files:**
- Delete: `src/cmd/config.ts`
- Delete: `src/cmd/config-helpers.ts`
- Modify: `src/cmd/index.ts`
- Modify: `tests/cli.test.ts`

**Step 1: Remove command registration**

- Delete import and registration of `registerConfigCommands`.
- Update the CLI file list test to remove `config.ts` and `config-helpers.ts`.

**Step 2: Run tests to verify they pass**

Run: `bun run test -- tests/cli.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/cmd/index.ts tests/cli.test.ts
git rm src/cmd/config.ts src/cmd/config-helpers.ts
git commit -m "feat: remove config command"
```

### Task 3: Remove config tests

**Files:**
- Delete: `tests/cmd/config.test.ts`
- Delete: `tests/cmd/config-helpers.test.ts`

**Step 1: Remove tests**

```bash
git rm tests/cmd/config.test.ts tests/cmd/config-helpers.test.ts
```

**Step 2: Run test to verify it passes**

Run: `bun run test -- tests/cmd/config.test.ts`
Expected: FAIL (file removed) and overall suite should pass after full test run.

**Step 3: Commit**

```bash
git add -A
git commit -m "test: remove config command coverage"
```

### Task 4: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `README.zh-cn.md`
- Modify: `README.ja.md`

**Step 1: Remove config command references**

- Remove any `getrouter config` examples.
- Add a short note that config is edited in `~/.getrouter/config.json`.

**Step 2: Commit**

```bash
git add README.md README.zh-cn.md README.ja.md
git commit -m "docs: remove config command"
```

### Task 5: Full verification

**Step 1: Run tests**

Run: `bun run test`
Expected: PASS

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run lint**

Run: `bun run lint`
Expected: PASS

**Step 4: Run format**

Run: `bun run format`
Expected: PASS
