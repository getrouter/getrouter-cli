# Keys Interactive Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add interactive key selection for `keys get/update/delete` when `id` is omitted, with non-TTY fallback errors and delete confirmation.

**Architecture:** Introduce a small interactive helper using `prompts` to select a key from `ListConsumers` (sorted by `createdAt` desc) and confirm deletes. Update `cmd/keys` to make `id` optional, gate on `process.stdin.isTTY`, and route through selection/confirmation while keeping `--json` output unchanged.

**Tech Stack:** TypeScript, Commander, Vitest, prompts.

**Skills:** @superpowers:test-driven-development, @superpowers:systematic-debugging (if failures)

### Task 1: Add prompts dependency and failing tests for interactive selection

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Add prompts dependency**

Run: `npm install prompts`

**Step 2: Write the failing tests**

```ts
import prompts from "prompts";
import { describe, it, expect, vi, afterEach } from "vitest";

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", {
    value,
    configurable: true,
  });
};

afterEach(() => {
  setStdinTTY(originalIsTTY);
  prompts.inject([]);
});

it("get selects newest key when id is missing", async () => {
  setStdinTTY(true);
  prompts.inject([0]);
  const listConsumers = vi.fn().mockResolvedValue({
    consumers: [
      { id: "old", name: "old", enabled: true, createdAt: "2026-01-01T00:00:00Z" },
      { id: "new", name: "new", enabled: true, createdAt: "2026-01-02T00:00:00Z" },
    ],
  });
  const getConsumer = vi
    .fn()
    .mockResolvedValue({ ...mockConsumer, id: "new" });
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: { ListConsumers: listConsumers, GetConsumer: getConsumer },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys", "get"]);
  expect(getConsumer).toHaveBeenCalledWith({ id: "new" });
  log.mockRestore();
});

it("delete does not run when confirmation is declined", async () => {
  setStdinTTY(true);
  prompts.inject([0, false]);
  const deleteConsumer = vi.fn().mockResolvedValue({});
  const listConsumers = vi.fn().mockResolvedValue({
    consumers: [
      { id: "c1", name: "dev", enabled: true, createdAt: "2026-01-01T00:00:00Z" },
    ],
  });
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: { ListConsumers: listConsumers, DeleteConsumer: deleteConsumer },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys", "delete"]);
  expect(deleteConsumer).not.toHaveBeenCalled();
  log.mockRestore();
});

it("get without id fails in non-tty mode", async () => {
  setStdinTTY(false);
  const program = createProgram();
  await expect(
    program.parseAsync(["node", "getrouter", "keys", "get"])
  ).rejects.toThrow("缺少 id");
});
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: FAIL because `keys get/delete` still require explicit `id` and no interactive selection exists.

**Step 4: Commit the failing tests**

```bash
git add package.json package-lock.json tests/cmd/keys.test.ts
git commit -m "test: cover keys interactive selection"
```

### Task 2: Implement interactive selection helper and wire commands

**Files:**
- Create: `src/core/interactive/keys.ts`
- Modify: `src/cmd/keys.ts`
- Test: `tests/cmd/keys.test.ts`

**Step 1: Create interactive helper**

```ts
import prompts from "prompts";

type Consumer = {
  id?: string;
  name?: string;
  enabled?: boolean;
  createdAt?: string;
};

type ConsumerService = {
  ListConsumers: (args: { pageSize?: number; pageToken?: string }) => Promise<{ consumers?: Consumer[] }>;
};

const sortByCreatedAtDesc = (consumers: Consumer[]) =>
  consumers
    .slice()
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt ?? "") || 0;
      const bTime = Date.parse(b.createdAt ?? "") || 0;
      return bTime - aTime;
    });

const formatChoice = (consumer: Consumer) => {
  const name = consumer.name ?? "-";
  const id = consumer.id ?? "-";
  const enabled = consumer.enabled == null ? "-" : consumer.enabled ? "ENABLED" : "DISABLED";
  const createdAt = consumer.createdAt ?? "-";
  return `${name} (${id}) | ${enabled} | ${createdAt}`;
};

export const selectConsumer = async (consumerService: ConsumerService) => {
  const res = await consumerService.ListConsumers({ pageSize: undefined, pageToken: undefined });
  const consumers = res?.consumers ?? [];
  if (consumers.length === 0) {
    throw new Error("没有可用的 API key");
  }
  const sorted = sortByCreatedAtDesc(consumers);
  const response = await prompts({
    type: "select",
    name: "id",
    message: "选择 API key",
    choices: sorted.map((consumer) => ({
      title: formatChoice(consumer),
      value: consumer.id,
    })),
  });
  if (!response.id) return null;
  return sorted.find((consumer) => consumer.id === response.id) ?? { id: response.id };
};

export const confirmDelete = async (consumer: Consumer) => {
  const name = consumer.name ?? "-";
  const id = consumer.id ?? "-";
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: `确认删除 ${name} (${id})?`,
    initial: false,
  });
  return Boolean(response.confirm);
};
```

**Step 2: Wire interactive selection into commands**

```ts
// imports
import { selectConsumer, confirmDelete } from "../core/interactive/keys";

// make args optional
.argument("[id]")

// in get/update/delete
if (!id) {
  if (!process.stdin.isTTY) {
    throw new Error("缺少 id");
  }
  const selected = await selectConsumer(consumerService);
  if (!selected?.id) return;
  id = selected.id;
}
```

For delete confirmation:

```ts
let selected: any = null;
if (!id) {
  if (!process.stdin.isTTY) {
    throw new Error("缺少 id");
  }
  selected = await selectConsumer(consumerService);
  if (!selected?.id) return;
  id = selected.id;
  const confirmed = await confirmDelete(selected);
  if (!confirmed) return;
}
```

**Step 3: Run tests to verify pass**

Run: `npm test -- tests/cmd/keys.test.ts`

Expected: PASS

**Step 4: Commit**

```bash
git add src/cmd/keys.ts src/core/interactive/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: add interactive selection for keys"
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
