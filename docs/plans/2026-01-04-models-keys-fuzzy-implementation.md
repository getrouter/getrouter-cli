# Models & Keys Fuzzy Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add interactive fuzzy selection for `models` and `keys` (no `list`), keep `list` as non-interactive output, and copy selected IDs/keys to clipboard when possible.

**Architecture:** Implement a small fuzzy ranking helper and a best-effort clipboard helper, then wire them into the `models` and `keys` commands. `models`/`keys` without `list` use the fuzzy flow; `models list`/`keys list` remain list output. Clipboard copy uses platform tools with graceful fallback.

**Tech Stack:** TypeScript, Commander.js, prompts, Vitest, Biome.

---

### Task 1: Add fuzzy ranking + selection helpers

**Files:**
- Create: `src/core/interactive/fuzzy.ts`
- Test: `tests/core/interactive/fuzzy.test.ts`

**Step 1: Write the failing test**

Create `tests/core/interactive/fuzzy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rankFuzzyChoices } from "../../src/core/interactive/fuzzy";

const choices = [
  { title: "gpt-5", value: "gpt-5", keywords: ["openai"] },
  { title: "claude-3", value: "claude-3", keywords: ["anthropic"] },
  { title: "gpt-4o", value: "gpt-4o", keywords: ["openai"] },
];

describe("rankFuzzyChoices", () => {
  it("ranks by fuzzy match and uses keywords", () => {
    const ranked = rankFuzzyChoices(choices, "open");
    expect(ranked[0]?.value).toBe("gpt-5");
    expect(ranked[1]?.value).toBe("gpt-4o");
  });

  it("returns all when query is empty", () => {
    const ranked = rankFuzzyChoices(choices, "");
    expect(ranked.map((c) => c.value)).toEqual(["gpt-5", "claude-3", "gpt-4o"]);
  });

  it("limits results", () => {
    const ranked = rankFuzzyChoices(choices, "g", 2);
    expect(ranked.length).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/core/interactive/fuzzy.test.ts`
Expected: FAIL (module or function missing).

**Step 3: Write minimal implementation**

Create `src/core/interactive/fuzzy.ts`:

```ts
import prompts from "prompts";

export type FuzzyChoice<T> = {
  title: string;
  value: T;
  keywords?: string[];
};

const normalize = (value: string) => value.toLowerCase();

const fuzzyScore = (query: string, target: string): number | null => {
  if (!query) return 0;
  let score = 0;
  let lastIndex = -1;
  for (const ch of query) {
    const index = target.indexOf(ch, lastIndex + 1);
    if (index === -1) return null;
    score += index;
    lastIndex = index;
  }
  return score;
};

const toSearchText = <T>(choice: FuzzyChoice<T>) =>
  normalize(
    [choice.title, ...(choice.keywords ?? [])].join(" ").trim(),
  );

export const rankFuzzyChoices = <T>(
  choices: FuzzyChoice<T>[],
  input: string,
  limit = 50,
) => {
  const query = normalize(input.trim());
  if (!query) return choices.slice(0, limit);
  const ranked = choices
    .map((choice) => {
      const score = fuzzyScore(query, toSearchText(choice));
      return score == null ? null : { choice, score };
    })
    .filter(Boolean) as { choice: FuzzyChoice<T>; score: number }[];
  ranked.sort((a, b) => a.score - b.score || a.choice.title.localeCompare(b.choice.title));
  return ranked.slice(0, limit).map((entry) => entry.choice);
};

export const fuzzySelect = async <T>({
  message,
  choices,
}: {
  message: string;
  choices: FuzzyChoice<T>[];
}): Promise<T | null> => {
  const response = await prompts({
    type: "autocomplete",
    name: "value",
    message,
    choices,
    suggest: async (input: string, items: FuzzyChoice<T>[]) =>
      rankFuzzyChoices(items, input),
  });
  if (response.value == null || response.value === "") return null;
  return response.value as T;
};
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- tests/core/interactive/fuzzy.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/core/interactive/fuzzy.test.ts src/core/interactive/fuzzy.ts
git commit -m "feat: add fuzzy ranking helper"
```

---

### Task 2: Add clipboard helper

**Files:**
- Create: `src/core/interactive/clipboard.ts`
- Test: `tests/core/interactive/clipboard.test.ts`

**Step 1: Write the failing test**

Create `tests/core/interactive/clipboard.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { copyToClipboard, getClipboardCommands } from "../../src/core/interactive/clipboard";

const makeSpawn = () =>
  vi.fn(() => {
    const handlers: Record<string, Array<(code?: number) => void>> = {};
    const child = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: (event: string, cb: (code?: number) => void) => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(cb);
        return child;
      },
    };
    queueMicrotask(() => handlers.close?.forEach((cb) => cb(0)));
    return child;
  });

describe("getClipboardCommands", () => {
  it("returns pbcopy on darwin", () => {
    expect(getClipboardCommands("darwin")[0]?.command).toBe("pbcopy");
  });
});

describe("copyToClipboard", () => {
  it("writes to clipboard with provided spawn", async () => {
    const spawnFn = makeSpawn();
    const ok = await copyToClipboard("hello", { platform: "darwin", spawnFn });
    expect(ok).toBe(true);
    expect(spawnFn).toHaveBeenCalledWith("pbcopy", [], { stdio: ["pipe", "ignore", "ignore"] });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/core/interactive/clipboard.test.ts`
Expected: FAIL (module or function missing).

**Step 3: Write minimal implementation**

Create `src/core/interactive/clipboard.ts`:

```ts
import { spawn } from "node:child_process";

type ClipboardCommand = {
  command: string;
  args: string[];
};

type CopyOptions = {
  platform?: NodeJS.Platform;
  spawnFn?: typeof spawn;
};

export const getClipboardCommands = (platform: NodeJS.Platform): ClipboardCommand[] => {
  if (platform === "darwin") return [{ command: "pbcopy", args: [] }];
  if (platform === "win32") return [{ command: "clip", args: [] }];
  return [
    { command: "wl-copy", args: [] },
    { command: "xclip", args: ["-selection", "clipboard"] },
  ];
};

const runClipboardCommand = (
  text: string,
  command: ClipboardCommand,
  spawnFn: typeof spawn,
): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawnFn(command.command, command.args, {
      stdio: ["pipe", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    child.stdin.write(text);
    child.stdin.end();
  });

export const copyToClipboard = async (text: string, options: CopyOptions = {}) => {
  if (!text) return false;
  const platform = options.platform ?? process.platform;
  const spawnFn = options.spawnFn ?? spawn;
  const commands = getClipboardCommands(platform);
  for (const command of commands) {
    const ok = await runClipboardCommand(text, command, spawnFn);
    if (ok) return true;
  }
  return false;
};
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- tests/core/interactive/clipboard.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/core/interactive/clipboard.test.ts src/core/interactive/clipboard.ts
git commit -m "feat: add clipboard helper"
```

---

### Task 3: Add ModelService to API client

**Files:**
- Modify: `src/core/api/client.ts`
- Modify: `tests/core/api/client.test.ts`

**Step 1: Write the failing test**

Update `tests/core/api/client.test.ts` to include model client factory:

```ts
import type { ModelService } from "../../../src/generated/router/dashboard/v1";

// inside fakeClients
createModelServiceClient: (handler: RequestHandler) =>
  ({
    ListModels: () =>
      handler(
        { path: "v1/dashboard/models", method: "GET", body: null },
        { service: "ModelService", method: "ListModels" },
      ),
  }) as unknown as ModelService,
```

Add a small assertion in the first test to ensure model service exists:

```ts
const { modelService } = createApiClients({ fetchImpl, clients: fakeClients });
const modelsRes = await modelService.ListModels({ pageSize: 0, pageToken: "", filter: "" });
const modelsPayload = modelsRes as unknown as { url: string; init: RequestInit };
expect(modelsPayload.url).toContain("/v1/dashboard/models");
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/core/api/client.test.ts`
Expected: FAIL (createModelServiceClient not wired / modelService missing).

**Step 3: Write minimal implementation**

Update `src/core/api/client.ts` to add model client wiring:

```ts
import type { ModelService } from "../../generated/router/dashboard/v1";
import { createModelServiceClient } from "../../generated/router/dashboard/v1";

// extend ClientFactories + ApiClients
createModelServiceClient: (handler: RequestHandler) => ModelService;
modelService: ModelService;

// in createApiClients()
createModelServiceClient,

// return object
modelService: factories.createModelServiceClient(handler),
```

**Step 4: Run test to verify it passes**

Run: `bun run test -- tests/core/api/client.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/api/client.ts tests/core/api/client.test.ts
git commit -m "feat: add model service to api client"
```

---

### Task 4: Implement models list + fuzzy selection

**Files:**
- Modify: `src/cmd/models.ts`
- Modify: `src/cmd/index.ts`
- Test: `tests/cmd/models.test.ts`
- (If needed) Modify: `tests/cmd/*.test.ts` to include `modelService` in mocked `createApiClients` returns

**Step 1: Write the failing tests**

Create `tests/cmd/models.test.ts`:

```ts
import prompts from "prompts";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import type { ModelService } from "../../src/generated/router/dashboard/v1";
import { copyToClipboard } from "../../src/core/interactive/clipboard";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

vi.mock("../../src/core/interactive/clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", { value, configurable: true });
};

const mockModel = {
  id: "gpt-5",
  name: "GPT-5",
  author: "OpenAI",
  enabled: true,
  updatedAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  setStdinTTY(originalIsTTY);
  prompts.inject([]);
});

describe("models command", () => {
  it("lists models with list subcommand", async () => {
    setStdinTTY(false);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modelService: {
        ListModels: vi.fn().mockResolvedValue({ models: [mockModel] }),
      } as unknown as ModelService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "models", "list"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("ID");
    expect(output).toContain("NAME");
    log.mockRestore();
  });

  it("uses fuzzy selection when no subcommand", async () => {
    setStdinTTY(true);
    prompts.inject([0]);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modelService: {
        ListModels: vi.fn().mockResolvedValue({ models: [mockModel] }),
      } as unknown as ModelService,
    });
    (copyToClipboard as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "models"]);
    expect(copyToClipboard).toHaveBeenCalledWith("gpt-5");
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("ID");
    expect(output).toContain("GPT-5");
    log.mockRestore();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/cmd/models.test.ts`
Expected: FAIL (command not wired / modelService not used / copy missing).

**Step 3: Write minimal implementation**

Update `src/cmd/models.ts` to add list + fuzzy behavior:

```ts
import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { renderTable } from "../core/output/table";
import { fuzzySelect } from "../core/interactive/fuzzy";
import { copyToClipboard } from "../core/interactive/clipboard";
import type { routercommonv1_Model } from "../generated/router/dashboard/v1";

const modelHeaders = ["ID", "NAME", "AUTHOR", "ENABLED", "UPDATED_AT"];

const modelRow = (model: routercommonv1_Model) => [
  String(model.id ?? ""),
  String(model.name ?? ""),
  String(model.author ?? ""),
  String(model.enabled ?? ""),
  String(model.updatedAt ?? ""),
];

const outputModels = (models: routercommonv1_Model[]) => {
  console.log("🧠 Models");
  console.log(renderTable(modelHeaders, models.map(modelRow)));
};

const outputModel = (model: routercommonv1_Model) => {
  console.log(renderTable(modelHeaders, [modelRow(model)]));
};

const listModels = async () => {
  const { modelService } = createApiClients({});
  const res = await modelService.ListModels({
    pageSize: undefined,
    pageToken: undefined,
    filter: undefined,
  });
  const models = res?.models ?? [];
  if (models.length === 0) {
    console.log("😕 No models found");
    return;
  }
  outputModels(models);
};

const fuzzyModels = async () => {
  const { modelService } = createApiClients({});
  const res = await modelService.ListModels({
    pageSize: undefined,
    pageToken: undefined,
    filter: undefined,
  });
  const models = res?.models ?? [];
  if (models.length === 0) {
    console.log("😕 No models found");
    return;
  }
  const selected = await fuzzySelect({
    message: "🔎 Search models",
    choices: models.map((model) => ({
      title: `${model.name ?? "-"} (${model.id ?? "-"})`,
      value: model,
      keywords: [model.id ?? "", model.author ?? ""].filter(Boolean),
    })),
  });
  if (!selected) return;
  outputModel(selected);
  const copied = await copyToClipboard(selected.id ?? "");
  if (copied) {
    console.log("📋 Copied model id");
  } else if (selected.id) {
    console.log(`Model id: ${selected.id}`);
  }
};

export const registerModelsCommands = (program: Command) => {
  const models = program.command("models").description("List models");

  models.action(async () => {
    if (!process.stdin.isTTY) {
      await listModels();
      return;
    }
    await fuzzyModels();
  });

  models
    .command("list")
    .description("List models")
    .action(async () => {
      await listModels();
    });
};
```

Update `src/cmd/index.ts` to register models:

```ts
import { registerModelsCommands } from "./models";
// ...
registerModelsCommands(program);
```

If other tests now require `modelService` in mocked `createApiClients`, add:

```ts
modelService: {} as unknown as ModelService,
```

**Step 4: Run tests to verify they pass**

Run: `bun run test -- tests/cmd/models.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cmd/models.ts src/cmd/index.ts tests/cmd/models.test.ts tests/cmd/*.test.ts
git commit -m "feat: add models list and fuzzy selection"
```

---

### Task 5: Implement keys fuzzy selection + copy API key

**Files:**
- Modify: `src/cmd/keys.ts`
- Modify: `src/core/interactive/keys.ts`
- Test: `tests/cmd/keys.test.ts`

**Step 1: Write the failing tests**

Update `tests/cmd/keys.test.ts`:

- Remove the “requires a subcommand” expectation.
- Add a new test for fuzzy selection on `keys` (no subcommand) with clipboard copy:

```ts
import { copyToClipboard } from "../../src/core/interactive/clipboard";

vi.mock("../../src/core/interactive/clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

it("uses fuzzy selection when no subcommand", async () => {
  setStdinTTY(true);
  prompts.inject([0]);
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
    } as unknown as ConsumerService,
    subscriptionService: emptySubscriptionService,
    authService: emptyAuthService,
  });
  (copyToClipboard as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys"]);
  expect(copyToClipboard).toHaveBeenCalledWith("abcd1234WXYZ");
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -- tests/cmd/keys.test.ts`
Expected: FAIL (no fuzzy behavior / clipboard not called).

**Step 3: Write minimal implementation**

Update `src/core/interactive/keys.ts` to use fuzzy selection for consumers:

```ts
import { fuzzySelect } from "./fuzzy";

export const selectConsumer = async (
  consumerService: ConsumerService,
): Promise<routercommonv1_Consumer | null> => {
  const res = await consumerService.ListConsumers({
    pageSize: undefined,
    pageToken: undefined,
  });
  const consumers = res?.consumers ?? [];
  if (consumers.length === 0) {
    throw new Error("No available API keys");
  }
  const sorted = sortByCreatedAtDesc(consumers);
  const selected = await fuzzySelect({
    message: "🔎 Search keys",
    choices: sorted.map((consumer) => ({
      title: formatChoice(consumer),
      value: consumer,
      keywords: [consumer.id ?? "", consumer.name ?? ""].filter(Boolean),
    })),
  });
  return selected ?? null;
};
```

Update `src/cmd/keys.ts` to add fuzzy behavior on base `keys` command and copy API key:

```ts
import { copyToClipboard } from "../core/interactive/clipboard";

const fuzzyKeys = async () => {
  const { consumerService } = createApiClients({});
  const selected = await selectConsumer(consumerService);
  if (!selected) return;
  outputConsumerTable(redactConsumer(selected));
  const apiKey = selected.apiKey ?? "";
  const copied = await copyToClipboard(apiKey);
  if (copied) {
    console.log("📋 Copied API key");
  } else if (apiKey) {
    console.log(`API key: ${apiKey}`);
  }
};

// In registerKeysCommands
keys.action(async () => {
  if (!process.stdin.isTTY) {
    console.error(
      "Use subcommand: list|get|create|update|delete (e.g. `getrouter keys list`).",
    );
    process.exitCode = 1;
    return;
  }
  await fuzzyKeys();
});
```

**Step 4: Run tests to verify they pass**

Run: `bun run test -- tests/cmd/keys.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/interactive/keys.ts src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: add keys fuzzy selection"
```

---

### Task 6: Full verification

**Files:**
- N/A

**Step 1: Run full test suite**

Run: `bun run test`
Expected: PASS.

**Step 2: Run typecheck + lint + format**

Run: `bun run typecheck`
Expected: PASS.

Run: `bun run lint`
Expected: PASS.

Run: `bun run format`
Expected: PASS (no changes).

**Step 3: Commit if formatting changes**

```bash
git add -A
git commit -m "chore: format"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-01-04-models-keys-fuzzy-implementation.md`. Two execution options:

1. Subagent-Driven (this session) – I dispatch fresh subagent per task, review between tasks
2. Parallel Session (separate) – Open new session with executing-plans, batch execution with checkpoints

Which approach?
