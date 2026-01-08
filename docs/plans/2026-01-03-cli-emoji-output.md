# CLI Emoji Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal emoji to interactive prompts and key status messages (login + confirmation) while keeping errors plain.

**Architecture:** Update user-facing string literals in auth flow and interactive key prompts; adjust tests to match new output.

**Tech Stack:** TypeScript, Vitest.

### Task 1: Add emoji to interactive/auth output strings

**Files:**
- Modify: `src/cmd/auth.ts`
- Modify: `src/core/interactive/keys.ts`

**Step 1: Update auth login output**

```ts
console.log("🔐 To authenticate, visit:");
console.log("⏳ Waiting for confirmation...");
console.log("✅ Login successful.");
```

**Step 2: Update key selection/delete prompts**

```ts
throw new Error("No available API keys");
message: "🔎 Select an API key",
message: `⚠️ Confirm delete ${name} (${id})?`,
```

### Task 2: Verify and commit

**Step 1: Run targeted tests**

Run: `npm test -- tests/cmd/auth.test.ts tests/cmd/keys.test.ts`
Expected: PASS. (No test updates expected; update assertions only if failures mention output strings.)

**Step 2: Commit**

```bash
git add src tests
 git commit -m "feat: add emoji to interactive cli output"
```
