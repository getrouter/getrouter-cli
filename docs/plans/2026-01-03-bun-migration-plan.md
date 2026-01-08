# Bun Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Bun the default package manager/tooling for the repo, remove npm lockfile, and add Bun-based CI.

**Architecture:** Replace npm usage with Bun in docs and CI, generate `bun.lock`, add `packageManager` in `package.json`, and delete `package-lock.json`.

**Tech Stack:** Bun, GitHub Actions, TypeScript.

### Task 1: Switch lockfile + package metadata

**Files:**
- Modify: `package.json`
- Delete: `package-lock.json`
- Create: `bun.lock`

**Step 1: Add Bun packageManager field**

Edit `package.json`:
```json
"packageManager": "bun@1.3.5"
```

**Step 2: Remove npm lockfile**

Delete `package-lock.json`.

**Step 3: Generate Bun lockfile**

Run:
```bash
bun install
```
Expected: `bun.lock` created.

### Task 2: Update contributor docs to Bun

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Update README install/dev/test commands (English + Chinese)**

Examples:
```md
bun install
bun run build
bun run dev -- --help
bun run test
bun run typecheck
```

**Step 2: Update AGENTS build/test commands to Bun**

Replace `npm` commands with `bun run` equivalents.

### Task 3: Add Bun-based GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Add CI workflow**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: "1.3.5"
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun run test
      - run: bun run build
```

### Task 4: Verify and commit

**Step 1: Run Bun checks locally**

Run:
```bash
bun run typecheck
bun run test
```
Expected: PASS.

**Step 2: Commit**

```bash
git add package.json bun.lock README.md AGENTS.md .github/workflows/ci.yml
git rm package-lock.json
git commit -m "chore: migrate tooling to bun"
```
