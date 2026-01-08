# Env Hook Auto-Source Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install a shell hook on `--install` so `getrouter codex/claude` auto-sources env vars in the current shell.

**Architecture:** Generate a shell-specific hook file and append a source line to the user’s rc file. The hook wraps `getrouter` and sources the env file after successful `codex/claude` runs.

**Tech Stack:** TypeScript, Commander, Vitest, Node fs.

### Task 1: Add failing tests for hook generation + installation

**Files:**
- Modify: `tests/core/setup/env.test.ts`
- Modify: `tests/cmd/codex.test.ts`
- Modify: `tests/cmd/claude.test.ts`

**Step 1: Write the failing tests**

```ts
// tests/core/setup/env.test.ts
import { getHookFilePath, renderHook } from "../../../src/core/setup/env";

it("renders sh hook", () => {
  const output = renderHook("bash");
  expect(output).toContain("getrouter() {");
  expect(output).toContain("command getrouter");
  expect(output).toContain("source");
});

it("renders pwsh hook", () => {
  const output = renderHook("pwsh");
  expect(output).toContain("function getrouter");
  expect(output).toContain("$LASTEXITCODE");
});

it("resolves hook file paths", () => {
  expect(getHookFilePath("bash", "/tmp")).toBe("/tmp/hook.sh");
  expect(getHookFilePath("zsh", "/tmp")).toBe("/tmp/hook.sh");
  expect(getHookFilePath("fish", "/tmp")).toBe("/tmp/hook.fish");
  expect(getHookFilePath("pwsh", "/tmp")).toBe("/tmp/hook.ps1");
});
```

```ts
// tests/cmd/codex.test.ts
import { getHookFilePath } from "../../src/core/setup/env";

it("installs hook into rc", async () => {
  // ...existing setup...
  await program.parseAsync(["node", "getrouter", "codex", "--install"]);
  const hookPath = getHookFilePath("bash", dir);
  expect(fs.existsSync(hookPath)).toBe(true);
  const rcContent = fs.readFileSync(rcPath ?? "", "utf8");
  expect(rcContent).toContain(`source ${hookPath}`);
});
```

```ts
// tests/cmd/claude.test.ts
import { getHookFilePath } from "../../src/core/setup/env";

it("installs hook into rc", async () => {
  // ...existing setup...
  await program.parseAsync(["node", "getrouter", "claude", "--install"]);
  const hookPath = getHookFilePath("bash", dir);
  expect(fs.existsSync(hookPath)).toBe(true);
  const rcContent = fs.readFileSync(rcPath ?? "", "utf8");
  expect(rcContent).toContain(`source ${hookPath}`);
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test -- tests/core/setup/env.test.ts`
Expected: FAIL (missing exports)

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: FAIL (hook not created)

**Step 3: Commit**

```bash
git add tests/core/setup/env.test.ts tests/cmd/codex.test.ts tests/cmd/claude.test.ts
git commit -m "test: cover env hook installation"
```

### Task 2: Implement hook generation + installation

**Files:**
- Modify: `src/core/setup/env.ts`
- Modify: `src/cmd/env.ts`

**Step 1: Implement hook helpers**

```ts
export const getHookFilePath = (shell: RcShell, configDir: string) => {
  if (shell === "pwsh") return path.join(configDir, "hook.ps1");
  if (shell === "fish") return path.join(configDir, "hook.fish");
  return path.join(configDir, "hook.sh");
};

export const renderHook = (shell: RcShell) => {
  // return shell-specific wrapper that auto-sources env file
};
```

**Step 2: Wire hook into `--install`**

```ts
const hookPath = getHookFilePath(shell, configDir);
writeEnvFile(hookPath, renderHook(shell));
appendRcIfMissing(rcPath, formatSourceLine(envShell, hookPath));
```

**Step 3: Run tests to verify they pass**

Run: `bun run test -- tests/core/setup/env.test.ts`
Expected: PASS

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: PASS

Run: `bun run test -- tests/cmd/claude.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/core/setup/env.ts src/cmd/env.ts
git commit -m "feat: install env auto-source hook"
```

### Task 3: Update docs

**Files:**
- Modify: `README.md`
- Modify: `README.zh-cn.md`
- Modify: `README.ja.md`

**Step 1: Add install hook note**

- Mention `--install` adds a shell hook that auto-sources env after `codex/claude`.
- Add a short note: reload your shell or `source ~/.zshrc` once to activate.

**Step 2: Commit**

```bash
git add README.md README.zh-cn.md README.ja.md
git commit -m "docs: document env auto-source hook"
```

### Task 4: Full verification

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
