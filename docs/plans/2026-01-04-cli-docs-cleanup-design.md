# CLI Command Cleanup + README Localization Design

## Goals
- Remove command entrypoints that are not registered in `--help` to keep the CLI surface minimal and consistent.
- Keep existing, registered commands unchanged (`auth`, `codex`, `claude`, `config`, `keys`, `models`, `status`, `usages`).
- Split README content by language: English in `README.md`, Simplified Chinese in `README.zh-cn.md`, and Japanese in `README.ja.md`.
- Keep documentation structure consistent across languages.

## Non-Goals
- No new commands or flags.
- No changes to existing command behavior or output.
- No dependency changes.

## Command Cleanup Scope
Commands that are implemented but not registered in `src/cmd/index.ts` should be removed:
- `src/cmd/plans.ts`
- `src/cmd/providers.ts`
- `src/cmd/subscription.ts`
- `src/cmd/user.ts`

Notes:
- `src/cmd/env.ts` stays because it is used by `codex` and `claude`.
- No tests currently cover the removed commands; no new tests required unless help output is asserted.

## Documentation Split
- `README.md`: English only. Add language switch links at the top.
- `README.zh-cn.md`: Move the existing Chinese section into this file.
- `README.ja.md`: Japanese translation based on the English README.
- Keep section order and content consistent across languages (Requirements, Install, Quick Start, etc.).

## Help Output Consistency
- Help output should only include the commands registered in `src/cmd/index.ts`.
- Removing unused command files ensures no confusion about unsupported commands.

## Testing Plan
- Run the full suite after changes:
  - `bun run test`
  - `bun run typecheck`
  - `bun run lint`
  - `bun run format`

## Files To Touch
- Delete: `src/cmd/plans.ts`
- Delete: `src/cmd/providers.ts`
- Delete: `src/cmd/subscription.ts`
- Delete: `src/cmd/user.ts`
- Modify: `README.md`
- Create: `README.zh-cn.md`
- Create: `README.ja.md`
