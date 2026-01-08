# getrouter CLI Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up a Node/TypeScript CLI scaffold for `getrouter` with build/test tooling, a minimal command tree, and initial core utilities.

**Architecture:** A thin CLI layer built on `commander` with an entrypoint in `src/bin.ts`, a program factory in `src/cli.ts`, placeholder command modules in `src/cmd/*`, and a small `core` utility for config paths. Build with `tsup` and test with `vitest`.

**Tech Stack:** Node.js 18+, TypeScript, commander, tsup, vitest.

---

### Task 1: Tooling & Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/.gitkeep`
- Create: `tests/.gitkeep`

**Step 1: Create package.json**

```json
{
  "name": "getrouter",
  "version": "0.1.0",
  "description": "CLI for getrouter.dev",
  "bin": {
    "getrouter": "dist/bin.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/bin.ts --help",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "tsup": "^8.3.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

**Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  format: ["cjs"],
  sourcemap: true,
  clean: true,
});
```

**Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
```

**Step 5: Add placeholder directories**

Create empty files to ensure directories are tracked:

- `src/.gitkeep`
- `tests/.gitkeep`

**Step 6: Install deps**

Run: `npm install`  
Expected: dependencies installed.

**Step 7: Sanity check tooling**

Run: `npm run typecheck`  
Expected: PASS (no TS files yet).

**Step 8: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts src/.gitkeep tests/.gitkeep
git commit -m "chore: bootstrap cli tooling"
```

---

### Task 2: Minimal CLI Program (TDD)

**Files:**
- Create: `src/cli.ts`
- Create: `src/bin.ts`
- Create: `tests/cli.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { createProgram } from "../src/cli";

describe("getrouter cli", () => {
  it("exposes name and help", () => {
    const program = createProgram();
    expect(program.name()).toBe("getrouter");
    expect(program.helpInformation()).toContain("getrouter");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found or createProgram missing).

**Step 3: Write minimal implementation**

`src/cli.ts`

```ts
import { Command } from "commander";

export const createProgram = () => {
  const program = new Command();
  program
    .name("getrouter")
    .description("CLI for getrouter.dev")
    .version("0.1.0");
  return program;
};
```

`src/bin.ts`

```ts
#!/usr/bin/env node
import { createProgram } from "./cli";

createProgram().parse(process.argv);
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/cli.ts src/bin.ts tests/cli.test.ts
git commit -m "feat: add minimal cli entrypoint"
```

---

### Task 3: Command Tree Skeleton

**Files:**
- Create: `src/cmd/index.ts`
- Create: `src/cmd/auth.ts`
- Create: `src/cmd/keys.ts`
- Create: `src/cmd/subscription.ts`
- Create: `src/cmd/plans.ts`
- Create: `src/cmd/models.ts`
- Create: `src/cmd/providers.ts`
- Create: `src/cmd/user.ts`
- Modify: `src/cli.ts`

**Step 1: Implement command modules**

Example (`src/cmd/auth.ts`):

```ts
import { Command } from "commander";

export const registerAuthCommands = (program: Command) => {
  const auth = program.command("auth").description("Authentication");
  auth.command("login").description("Login with GitHub OAuth");
  auth.command("logout").description("Clear local auth state");
  auth.command("status").description("Show current auth status");
};
```

Repeat similarly for:
- `keys` (list/create/update/delete/get)
- `subscription` (show)
- `plans` (list)
- `models` (list)
- `providers` (list)
- `user` (current)

`src/cmd/index.ts`:

```ts
import { Command } from "commander";
import { registerAuthCommands } from "./auth";
import { registerKeysCommands } from "./keys";
import { registerSubscriptionCommands } from "./subscription";
import { registerPlansCommands } from "./plans";
import { registerModelsCommands } from "./models";
import { registerProvidersCommands } from "./providers";
import { registerUserCommands } from "./user";

export const registerCommands = (program: Command) => {
  registerAuthCommands(program);
  registerKeysCommands(program);
  registerSubscriptionCommands(program);
  registerPlansCommands(program);
  registerModelsCommands(program);
  registerProvidersCommands(program);
  registerUserCommands(program);
};
```

**Step 2: Wire command tree**

Modify `src/cli.ts`:

```ts
import { Command } from "commander";
import { registerCommands } from "./cmd";

export const createProgram = () => {
  const program = new Command();
  program
    .name("getrouter")
    .description("CLI for getrouter.dev")
    .version("0.1.0");
  registerCommands(program);
  return program;
};
```

**Step 3: Run tests**

Run: `npm test`  
Expected: PASS.

**Step 4: Commit**

```bash
git add src/cmd src/cli.ts
git commit -m "feat: add command tree skeleton"
```

---

### Task 4: Core Paths Utility (TDD)

**Files:**
- Create: `src/core/paths.ts`
- Create: `tests/paths.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getConfigDir } from "../src/core/paths";

describe("paths", () => {
  it("returns ~/.getrouter path", () => {
    const dir = getConfigDir();
    expect(dir).toContain(".getrouter");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
import path from "node:path";
import os from "node:os";

export const getConfigDir = () => path.join(os.homedir(), ".getrouter");
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/paths.ts tests/paths.test.ts
git commit -m "feat: add config path helper"
```
