# Codex Uninstall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `getrouter codex uninstall` to remove getrouter-managed Codex config entries while preserving user data.

**Architecture:** Extend `src/core/setup/codex.ts` with removal helpers for TOML and JSON. Wire a new `uninstall` subcommand in `src/cmd/codex.ts` that reads, cleans, and conditionally writes the files with clear status output.

**Tech Stack:** TypeScript, Commander.js, Vitest, Node fs/path/os.

### Task 1: Add uninstall command tests

**Files:**
- Modify: `tests/cmd/codex.test.ts`

**Step 1: Write the failing tests**

```ts
it("uninstall removes getrouter entries but keeps others", async () => {
  const dir = makeDir();
  process.env.HOME = dir;
  const codexDir = path.join(dir, ".codex");
  fs.mkdirSync(codexDir, { recursive: true });
  fs.writeFileSync(
    codexConfigPath(dir),
    [
      'theme = "dark"',
      'model = "keep"',
      'model_reasoning_effort = "low"',
      'model_provider = "getrouter"',
      "",
      "[model_providers.getrouter]",
      'name = "getrouter"',
      'base_url = "https://api.getrouter.dev/codex"',
      "",
      "[model_providers.other]",
      'name = "other"',
    ].join("\n"),
  );
  fs.writeFileSync(
    codexAuthPath(dir),
    JSON.stringify({ OTHER: "keep", OPENAI_API_KEY: "old" }, null, 2),
  );

  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "codex", "uninstall"]);

  const config = fs.readFileSync(codexConfigPath(dir), "utf8");
  expect(config).toContain('theme = "dark"');
  expect(config).toContain('[model_providers.other]');
  expect(config).not.toContain('[model_providers.getrouter]');
  expect(config).not.toContain('model_provider = "getrouter"');

  const auth = JSON.parse(fs.readFileSync(codexAuthPath(dir), "utf8"));
  expect(auth.OTHER).toBe("keep");
  expect(auth.OPENAI_API_KEY).toBeUndefined();
});

it("uninstall leaves root keys when provider is not getrouter", async () => {
  const dir = makeDir();
  process.env.HOME = dir;
  const codexDir = path.join(dir, ".codex");
  fs.mkdirSync(codexDir, { recursive: true });
  fs.writeFileSync(
    codexConfigPath(dir),
    [
      'model = "keep"',
      'model_reasoning_effort = "low"',
      'model_provider = "other"',
      "",
      "[model_providers.getrouter]",
      'name = "getrouter"',
    ].join("\n"),
  );

  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "codex", "uninstall"]);

  const config = fs.readFileSync(codexConfigPath(dir), "utf8");
  expect(config).toContain('model = "keep"');
  expect(config).toContain('model_provider = "other"');
  expect(config).not.toContain('[model_providers.getrouter]');
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: FAIL with an error like "unknown command 'uninstall'" or missing behavior.

**Step 3: Commit**

```bash
git add tests/cmd/codex.test.ts
git commit -m "test: cover codex uninstall"
```

### Task 2: Implement removal helpers

**Files:**
- Modify: `src/core/setup/codex.ts`

**Step 1: Write the minimal implementation**

```ts
export const removeCodexConfig = (content: string) => {
  const lines = content.length ? content.split(/\r?\n/) : [];
  const updated: string[] = [];
  let inGetrouterSection = false;
  let providerIsGetrouter = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const headerMatch = matchHeader(line);
    if (headerMatch) {
      const section = headerMatch[1]?.trim() ?? "";
      inGetrouterSection = section === PROVIDER_SECTION;
      if (inGetrouterSection) continue;
    }
    if (inGetrouterSection) continue;

    const keyMatch = matchKey(line);
    if (keyMatch && keyMatch[1] === "model_provider") {
      providerIsGetrouter = /getrouter/i.test(line);
    }

    updated.push(line);
  }

  if (providerIsGetrouter) {
    return {
      content: updated
        .filter(
          (line) =>
            !/^\s*model\s*=/.test(line) &&
            !/^\s*model_reasoning_effort\s*=/.test(line) &&
            !/^\s*model_provider\s*=/.test(line),
        )
        .join("\n"),
      changed: true,
    };
  }

  return { content: updated.join("\n"), changed: updated.join("\n") !== content };
};

export const removeAuthJson = (data: Record<string, unknown>) => {
  if (!("OPENAI_API_KEY" in data)) return { data, changed: false };
  const { OPENAI_API_KEY: _ignored, ...rest } = data;
  return { data: rest, changed: true };
};
```

**Step 2: Run test to verify it still fails**

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: FAIL until CLI wiring is added.

**Step 3: Commit**

```bash
git add src/core/setup/codex.ts
git commit -m "feat: add codex uninstall helpers"
```

### Task 3: Wire the uninstall subcommand

**Files:**
- Modify: `src/cmd/codex.ts`

**Step 1: Add the uninstall command**

```ts
import { removeAuthJson, removeCodexConfig } from "../core/setup/codex";

const logMissing = (filePath: string) =>
  console.log(`ℹ️ ${filePath} not found`);

const logNoop = (filePath: string) =>
  console.log(`ℹ️ No getrouter entries in ${filePath}`);

const logRemoved = (filePath: string) =>
  console.log(`✅ Removed getrouter entries from ${filePath}`);

// in registerCodexCommand
const codex = program.command("codex").description("Configure Codex");

codex
  .command("uninstall")
  .description("Remove getrouter Codex configuration")
  .action(() => {
    const codexDir = ensureCodexDir();
    const configPath = path.join(codexDir, "config.toml");
    const authPath = path.join(codexDir, "auth.json");

    if (!fs.existsSync(configPath)) {
      logMissing(configPath);
    } else {
      const content = readFileIfExists(configPath);
      const removed = removeCodexConfig(content);
      if (removed.changed) {
        fs.writeFileSync(configPath, removed.content, "utf8");
        logRemoved(configPath);
      } else {
        logNoop(configPath);
      }
    }

    if (!fs.existsSync(authPath)) {
      logMissing(authPath);
    } else {
      const raw = fs.readFileSync(authPath, "utf8").trim();
      const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const removed = removeAuthJson(data);
      if (removed.changed) {
        fs.writeFileSync(authPath, JSON.stringify(removed.data, null, 2));
        logRemoved(authPath);
      } else {
        logNoop(authPath);
      }
    }
  });
```

**Step 2: Run tests to verify they pass**

Run: `bun run test -- tests/cmd/codex.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add src/cmd/codex.ts tests/cmd/codex.test.ts
git commit -m "feat: add codex uninstall command"
```

### Task 4: Final verification

**Files:**
- Verify: `src/cmd/codex.ts`, `src/core/setup/codex.ts`, `tests/cmd/codex.test.ts`

**Step 1: Run full checks**

Run: `bun run test && bun run lint && bun run format`
Expected: PASS

**Step 2: Commit formatting (if needed)**

```bash
git add src/cmd/codex.ts src/core/setup/codex.ts tests/cmd/codex.test.ts
git commit -m "chore: format codex uninstall"
```
