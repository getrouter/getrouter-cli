# AGENTS.md

## Purpose and scope
You help maintain this CLI repo by making small, safe, well-scoped changes. Focus on CLI behavior, tests, and docs that are directly related to the requested change. Avoid product or API contract decisions unless explicitly asked.

## Commands (copy/paste, include flags)
- Install: `bun install`
- Dev CLI: `bun run dev -- --help`
- Build: `bun run build`
- Format: `bun run format`
- Lint: `bun run lint`
- Test (all): `bun run test`
- Test (single): `bun run test -- tests/path/to/file.test.ts`
- Typecheck: `bun run typecheck`

## Tech stack (with versions)
- Runtime: Node >=18
- Package manager: Bun 1.3.5
- Language: TypeScript 5.7.3
- Test: Vitest 4.0.16
- Lint/format: Biome 2.3.11
- Build: tsdown 0.18.4
- Dev runner: tsx 4.19.2
- CLI: commander 14.0.2, prompts 2.4.2

## Repo map
- `src/` - CLI source (TypeScript)
- `src/cmd/` - Command handlers
- `src/core/` - Shared logic (auth, config, http, output, setup)
- `src/generated/` - Generated API clients (do not edit manually)
- `tests/` - Vitest suites mirroring `src/`
- `docs/plans/` - Design and implementation plans

## Entry flow
`src/bin.ts` → `src/cli.ts` (Commander program) → `src/cmd/index.ts` (registers commands)

## Core modules
- `src/core/api/client.ts` - Typed API clients from generated code
- `src/core/auth/` - Auth status checking and device flow polling
- `src/core/config/` - Config/auth file read/write (`~/.getrouter/`)
- `src/core/http/` - Request layer with auth headers and error handling
- `src/core/interactive/` - TTY prompts
- `src/core/output/` - Table rendering and usage charts
- `src/core/setup/` - Env file writers

## Config and environment
- Config dir: `~/.getrouter/` (override with `GETROUTER_CONFIG_DIR`)
- Files: `config.json` (settings), `auth.json` (tokens, 0600 permissions)
- Env vars: `GETROUTER_CONFIG_DIR`, `GETROUTER_AUTH_COOKIE`, `KRATOS_AUTH_COOKIE`

## Code style example (real snippet)
```ts
import { Command } from "commander";
import { version } from "../package.json";
import { registerCommands } from "./cmd";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("getrouter")
    .description("CLI for getrouter.dev")
    .version(version);

  registerCommands(program);

  return program;
}
```

## Standards
- TypeScript: 2-space indent, double quotes, ES modules.
- Use `import type` for type-only imports.
- Use `consoleLog()` for CLI output and add emojis for command output.
- Use `checkAuthenticated()` for auth-required commands.
- Use `createApiError()` and throw `ApiError` on HTTP failures.
- Validate config with Zod where applicable.
- Tests: mirror `src/` structure; cover success and error paths.

## Change management
- Commits: Conventional Commits (`feat|fix|refactor|docs|test|chore`), imperative, <=72 chars.
- One behavior per commit; stage atomically with `git add -p`.
- PRs: concise summary + test plan (commands run).

## Dependencies and environment
- Do not add or remove dependencies without approval.
- Keep `src/generated/` generated; do not edit manually.
- Use `bun install` when `package.json` or `bun.lock` changes.

## Boundaries (Always / Ask first / Never)
- Always:
  - Run targeted tests for touched areas.
  - Before finalizing, run `bun run test && bun run lint && bun run format`.
  - Redact tokens and secrets in logs/output.
- Ask first:
  - Adding/removing dependencies.
  - Changing config schemas or auth flows.
  - Modifying CI/GitHub Actions.
  - Editing generated code in `src/generated/`.
- Never:
  - Commit secrets or tokens.
  - Edit `node_modules/` or `dist/`.
  - Disable tests or bypass required checks.
