# CLI Command Cleanup + README Localization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unregistered command entrypoints and split README into English/Chinese/Japanese files.

**Architecture:** Keep the registered command list unchanged while deleting unused command modules. Split README content into language-specific files with a small language switch header.

**Tech Stack:** TypeScript, Vitest, Commander, Markdown.

### Task 1: Add a failing test that enforces the command entrypoint set

**Files:**
- Modify: `tests/cli.test.ts`

**Step 1: Write the failing test**

```ts
import { readdirSync } from "node:fs";
import path from "node:path";

it("only ships registered command entrypoints", () => {
  const cmdDir = path.join(process.cwd(), "src", "cmd");
  const files = readdirSync(cmdDir).filter((file) => file.endsWith(".ts"));
  const expected = [
    "auth.ts",
    "claude.ts",
    "codex.ts",
    "config-helpers.ts",
    "config.ts",
    "env.ts",
    "index.ts",
    "keys.ts",
    "models.ts",
    "status.ts",
    "usages.ts",
  ];
  expect(files.sort()).toEqual(expected.sort());
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/cli.test.ts`
Expected: FAIL (extra files exist in `src/cmd`).

**Step 3: Commit**

```bash
git add tests/cli.test.ts
git commit -m "test: guard cmd entrypoints"
```

### Task 2: Remove unused command entrypoints

**Files:**
- Delete: `src/cmd/plans.ts`
- Delete: `src/cmd/providers.ts`
- Delete: `src/cmd/subscription.ts`
- Delete: `src/cmd/user.ts`

**Step 1: Remove files**

```bash
rm src/cmd/plans.ts src/cmd/providers.ts src/cmd/subscription.ts src/cmd/user.ts
```

**Step 2: Run test to verify it passes**

Run: `bun run test -- tests/cli.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/cmd/plans.ts src/cmd/providers.ts src/cmd/subscription.ts src/cmd/user.ts
git commit -m "chore: remove unused cmd entrypoints"
```

### Task 3: Split README into language-specific files

**Files:**
- Modify: `README.md`
- Create: `README.zh-cn.md`
- Create: `README.ja.md`

**Step 1: Update `README.md` to English only and add language links**

Add a language switcher at the top, then keep only the English content.

**Step 2: Create `README.zh-cn.md`**

Move the current Chinese section into this file and add the same language switcher.

**Step 3: Create `README.ja.md`**

Translate the English content into Japanese, keeping the same structure and headings.

**Step 4: Commit**

```bash
git add README.md README.zh-cn.md README.ja.md
git commit -m "docs: split readmes by language"
```

### Task 4: Full verification

**Step 1: Run tests**

Run: `bun run test`
Expected: PASS.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS.

**Step 3: Run lint**

Run: `bun run lint`
Expected: PASS.

**Step 4: Run format**

Run: `bun run format`
Expected: PASS (no changes).
