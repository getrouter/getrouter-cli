# Tsdown Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace tsup with tsdown for builds, accept tsdown defaults, and remove tsup config/dependency.

**Architecture:** Use `tsdown` as the build script, add a minimal `tsdown.config.ts` with only `entry`, and update docs to reference tsdown.

**Tech Stack:** Bun, tsdown.

### Task 1: Switch build tooling to tsdown

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Delete: `tsup.config.ts`
- Create: `tsdown.config.ts`

**Step 1: Install tsdown and remove tsup**

Run:
```bash
bun add -d tsdown
bun remove tsup
```
Expected: `package.json` devDependencies updated, `bun.lock` updated.

**Step 2: Update build script**

Edit `package.json`:
```json
"build": "tsdown"
```

**Step 3: Add minimal tsdown config (defaults)**

Create `tsdown.config.ts`:
```ts
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bin.ts"],
});
```

**Step 4: Remove tsup config**

Delete `tsup.config.ts`.

### Task 2: Update docs to reference tsdown

**Files:**
- Modify: `AGENTS.md`

**Step 1: Update build description**

Replace tsup wording with tsdown in build command description.

### Task 3: Verify and commit

**Step 1: Run build**

Run:
```bash
bun run build
```
Expected: build completes without errors.

**Step 2: Commit**

```bash
git add package.json bun.lock tsdown.config.ts AGENTS.md
git rm tsup.config.ts
git commit -m "chore: migrate build to tsdown"
```
