# CLI English Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Chinese CLI user-facing strings with English equivalents and update tests.

**Architecture:** Update string literals in command handlers and interactive prompts, then update test expectations to match.

**Tech Stack:** TypeScript, Vitest.

### Task 1: Update CLI output strings in source

**Files:**
- Modify: `src/cmd/auth.ts`
- Modify: `src/core/auth/device.ts`
- Modify: `src/cmd/keys.ts`
- Modify: `src/cmd/subscription.ts`
- Modify: `src/cmd/setup.ts`
- Modify: `src/core/interactive/keys.ts`

**Step 1: Update auth command output**

```ts
console.log("Login successful.");
console.log("Cleared local auth data.");
```

**Step 2: Update device auth error messages**

```ts
throw new Error("Auth code already used. Please log in again.");
throw new Error("Auth code expired. Please log in again.");
throw new Error("Login timed out. Please run getrouter auth login again.");
```

**Step 3: Update keys command errors and success message**

```ts
throw new Error("Missing key id.");
console.log("Please store this API key securely.");
```

**Step 4: Update subscription status message**

```ts
console.log("No active subscription");
```

**Step 5: Update setup errors**

```ts
throw new Error("Missing key id.");
throw new Error("API key not found. Please create one or choose another.");
```

**Step 6: Update interactive prompts**

```ts
throw new Error("No available API keys");
message: "Select an API key",
message: `Confirm delete ${name} (${id})?`,
```

### Task 2: Update test expectations

**Files:**
- Modify: `tests/auth/device.test.ts`
- Modify: `tests/cmd/setup.test.ts`
- Modify: `tests/cmd/subscription.test.ts`
- Modify: `tests/cmd/auth.test.ts`
- Modify: `tests/cmd/keys.test.ts`

**Step 1: Update device auth error assertions**

```ts
).rejects.toThrow("Auth code already used");
).rejects.toThrow("Auth code expired");
).rejects.toThrow("Login timed out");
```

**Step 2: Update setup error assertion**

```ts
).rejects.toThrow("Missing key id");
```

**Step 3: Update subscription output assertion**

```ts
expect(output).toContain("No active subscription");
```

**Step 4: Update auth logout output assertion**

```ts
expect(log.mock.calls[0][0]).toContain("Cleared local auth data");
```

**Step 5: Update keys output/error assertions**

```ts
expect(output).toContain("Please store this API key securely.");
).rejects.toThrow("Missing key id");
```

### Task 3: Verify and commit

**Step 1: Confirm no Chinese text remains in src/tests**

Run: `rg -n "[\u4e00-\u9fff]" src tests`
Expected: no matches.

**Step 2: Run targeted tests**

Run: `npm test -- tests/auth/device.test.ts tests/cmd/auth.test.ts tests/cmd/keys.test.ts tests/cmd/setup.test.ts tests/cmd/subscription.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add src tests
git commit -m "refactor: switch cli output to English"
```
