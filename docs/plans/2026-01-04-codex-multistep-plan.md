# Codex Multi-step Config Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `getrouter codex` with a multi-step interactive flow that writes `~/.codex/config.toml` and `~/.codex/auth.json`, preserving existing keys.

**Architecture:** Add codex-specific interactive helpers and TOML/JSON merge utilities. Update codex command to use the new flow and remove env/hook writing for codex only.

**Tech Stack:** TypeScript, prompts, Vitest, Node fs.

### Task 1: Add failing tests for codex multi-step flow + file writes

**Files:**
- Modify: `tests/cmd/codex.test.ts`

**Step 1: Write the failing tests**

```ts
import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import { createProgram } from "../../src/cli";

const mockModels = [
  "gpt-5.2-codex",
  "gpt-5.1-codex-max",
  "gpt-5.1-codex-mini",
  "gpt-5.2",
];

it("writes codex config and auth after interactive flow", async () => {
  // arrange env + mock consumer
  // inject: model, reasoning, key, confirm
  // expect config.toml + auth.json content
});

it("merges existing codex config and auth", async () => {
  // write preexisting config.toml with extra keys and table
  // write preexisting auth.json with extra fields
  // run codex flow and assert extra keys are preserved
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: FAIL (codex still writes env/hook).

**Step 3: Commit**

```bash
git add tests/cmd/codex.test.ts
git commit -m "test: codex multistep flow"
```

### Task 2: Add codex config merge helpers

**Files:**
- Create: `src/core/setup/codex.ts`
- Test: `tests/core/setup/codex.test.ts`

**Step 1: Write the failing tests**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mergeCodexToml, mergeAuthJson } from "../../../src/core/setup/codex";

it("merges codex toml at root and provider table", () => {
  const input = "other = \"keep\"\n[model_providers.other]\nname = \"x\"\n";
  const output = mergeCodexToml(input, {
    model: "gpt-5.2-codex",
    reasoning: "xhigh",
  });
  expect(output).toContain("model = \"gpt-5.2-codex\"");
  expect(output).toContain("model_reasoning_effort = \"xhigh\"");
  expect(output).toContain("model_provider = \"getrouter\"");
  expect(output).toContain("[model_providers.getrouter]");
  expect(output).toContain("other = \"keep\"");
});

it("merges auth json", () => {
  const output = mergeAuthJson({ existing: "keep" }, "key-123");
  expect(output.OPENAI_API_KEY).toBe("key-123");
  expect(output.existing).toBe("keep");
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/core/setup/codex.test.ts`
Expected: FAIL (helpers missing).

**Step 3: Implement minimal helpers**

```ts
export const mergeCodexToml = (content: string, input: { model: string; reasoning: string }) => {
  // line-based update for top-level keys
  // update or append [model_providers.getrouter]
};

export const mergeAuthJson = (data: Record<string, unknown>, apiKey: string) => ({
  ...data,
  OPENAI_API_KEY: apiKey,
});
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- tests/core/setup/codex.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/setup/codex.ts tests/core/setup/codex.test.ts
git commit -m "feat: codex config merge helpers"
```

### Task 3: Add codex interactive helpers (model + reasoning)

**Files:**
- Create: `src/core/interactive/codex.ts`
- Test: `tests/core/interactive/codex.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { MODEL_CHOICES, REASONING_CHOICES, mapReasoningValue } from "../../../src/core/interactive/codex";

it("maps extra high to xhigh", () => {
  expect(mapReasoningValue("extra_high")).toBe("xhigh");
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/core/interactive/codex.test.ts`
Expected: FAIL (module missing).

**Step 3: Implement minimal helpers**

```ts
export const MODEL_CHOICES = [
  { id: "gpt-5.2-codex", title: "gpt-5.2-codex", description: "Latest frontier agentic coding model." },
  // ...
];

export const REASONING_CHOICES = [
  { id: "low", label: "Low", value: "low", description: "Fast responses with lighter reasoning" },
  { id: "medium", label: "Medium (default)", value: "medium", description: "Balances speed and reasoning depth for everyday tasks" },
  { id: "high", label: "High", value: "high", description: "Greater reasoning depth for complex problems" },
  { id: "extra_high", label: "Extra high", value: "xhigh", description: "Extra high reasoning depth for complex problems" },
];

export const mapReasoningValue = (id: string) =>
  REASONING_CHOICES.find((item) => item.id === id)?.value ?? "medium";
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- tests/core/interactive/codex.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/interactive/codex.ts tests/core/interactive/codex.test.ts
git commit -m "feat: codex interactive choices"
```

### Task 4: Implement codex command flow

**Files:**
- Modify: `src/cmd/codex.ts`
- Modify: `src/cmd/index.ts` (if needed)
- Modify: `tests/cmd/codex.test.ts`

**Step 1: Implement flow**

- Replace `registerEnvCommand` usage with custom `codex` command.
- Use fuzzy selects for model + reasoning.
- Use `selectConsumer` for key selection and fetch API key via `GetConsumer`.
- Confirm summary before writing.
- Write config/auth using helpers and set file permissions (0600).

**Step 2: Run test to verify it passes**

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/cmd/codex.ts tests/cmd/codex.test.ts
 git commit -m "feat: codex multistep config"
```

### Task 5: Update docs

**Files:**
- Modify: `README.md`
- Modify: `README.zh-cn.md`
- Modify: `README.ja.md`

**Step 1: Update codex description**

- Note that `getrouter codex` now configures `~/.codex/config.toml` + `~/.codex/auth.json`.
- Remove or soften env/hook wording for codex only (claude still env-based).

**Step 2: Commit**

```bash
git add README.md README.zh-cn.md README.ja.md
 git commit -m "docs: update codex config flow"
```

### Task 6: Full verification

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
