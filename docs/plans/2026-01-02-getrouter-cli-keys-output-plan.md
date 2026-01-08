# Keys List Table Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a reusable table renderer and switch `keys list` default output to a readable table format with truncation and redaction.

**Architecture:** Add `core/output/table` for width calculation + truncation, then update `cmd/keys` to render list rows via table when not `--json`.

**Tech Stack:** TypeScript, Node.js, vitest.

### Task 1: Add table renderer utility

**Files:**
- Create: `src/core/output/table.ts`
- Create: `tests/output/table.test.ts`

**Step 1: Write the failing test**

Create `tests/output/table.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderTable } from "../../src/core/output/table";

describe("table renderer", () => {
  it("renders headers and rows with alignment", () => {
    const out = renderTable(
      ["ID", "NAME"],
      [
        ["1", "alpha"],
        ["2", "beta"],
      ]
    );
    expect(out).toContain("ID");
    expect(out).toContain("NAME");
    expect(out).toContain("alpha");
  });

  it("truncates long cells", () => {
    const out = renderTable(["ID"], [["0123456789ABCDEFGHIJ"]], {
      maxColWidth: 8,
    });
    expect(out).toContain("0123...");
  });

  it("fills empty with dash", () => {
    const out = renderTable(["ID"], [[""]]);
    expect(out).toContain("-");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/output/table.test.ts`  
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

Create `src/core/output/table.ts`:

```ts
type TableOptions = { maxColWidth?: number };

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  if (max <= 3) return value.slice(0, max);
  return `${value.slice(0, max - 3)}...`;
};

export const renderTable = (
  headers: string[],
  rows: string[][],
  options: TableOptions = {}
) => {
  const maxColWidth = options.maxColWidth ?? 32;
  const normalized = rows.map((row) =>
    row.map((cell) => (cell && cell.length > 0 ? cell : "-"))
  );
  const widths = headers.map((h, i) => {
    const colValues = normalized.map((row) => row[i] ?? "-");
    const maxLen = Math.max(h.length, ...colValues.map((v) => v.length));
    return Math.min(maxLen, maxColWidth);
  });
  const renderRow = (cells: string[]) =>
    cells
      .map((cell, i) => {
        const raw = cell ?? "-";
        const clipped = truncate(raw, widths[i]);
        return clipped.padEnd(widths[i], " ");
      })
      .join("  ");
  const headerRow = renderRow(headers);
  const body = normalized.map((row) => renderRow(row)).join("\n");
  return `${headerRow}\n${body}`;
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/output/table.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/output/table.ts tests/output/table.test.ts
git commit -m "feat: add table renderer"
```

### Task 2: Switch keys list to table output

**Files:**
- Modify: `src/cmd/keys.ts`
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Write the failing test**

Update `tests/cmd/keys.test.ts` with a human-readable output assertion:

```ts
it("list prints table header in default mode", async () => {
  (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    consumerService: {
      ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
    },
    subscriptionService: {} as any,
  });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const program = createProgram();
  await program.parseAsync(["node", "getrouter", "keys", "list"]);
  const output = log.mock.calls.map((c) => c[0]).join("\n");
  expect(output).toContain("ID");
  expect(output).toContain("NAME");
  expect(output).toContain("API_KEY");
  log.mockRestore();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/cmd/keys.test.ts`  
Expected: FAIL (still key=value)

**Step 3: Write minimal implementation**

Update `src/cmd/keys.ts`:
- import `renderTable`
- in `keys list`, when not `--json`, build headers/rows and `console.log(renderTable(...))`
- map row cells to strings, use `-` for empty

Example mapping:
```ts
const headers = ["ID", "NAME", "ENABLED", "LAST_ACCESS", "CREATED_AT", "API_KEY"];
const rows = consumers.map((c) => [
  String(c.id ?? ""),
  String(c.name ?? ""),
  String(c.enabled ?? ""),
  String(c.lastAccess ?? ""),
  String(c.createdAt ?? ""),
  String(c.apiKey ?? ""),
]);
console.log(renderTable(headers, rows));
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/cmd/keys.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/cmd/keys.ts tests/cmd/keys.test.ts
git commit -m "feat: use table output for keys list"
```

---

Plan complete and saved to `docs/plans/2026-01-02-getrouter-cli-keys-output-plan.md`.

Two execution options:

1. Subagent-Driven (this session) — use superpowers:subagent-driven-development
2. Parallel Session (separate) — open a new session with executing-plans in this worktree

Which approach?
