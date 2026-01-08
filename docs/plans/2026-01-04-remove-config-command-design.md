# Remove Config Command Design

## Goals
- Remove the `getrouter config` command and its subcommand behavior from the CLI.
- Keep config file usage via `~/.getrouter/config.json` for runtime reads/writes.
- Update tests and docs to reflect removal.

## Non-Goals
- Do not change config file format or core config read/write logic.
- Do not add new CLI alternatives for config editing.

## Scope
- Delete `src/cmd/config.ts` and `src/cmd/config-helpers.ts`.
- Remove `registerConfigCommands` from command registration.
- Remove/replace tests for config commands and config helpers.
- Update CLI entrypoint file list test to match remaining commands.
- Update README docs to remove `getrouter config` references.

## Behavior Changes
- `getrouter config` should no longer be a recognized command.
- Users should edit `~/.getrouter/config.json` directly to change configuration.

## Testing Plan
- Add a test that asserts `getrouter config` is rejected by the CLI.
- Remove tests that exercise config subcommands or config helper parsing.
- Ensure remaining test suite passes unchanged.

## Files
- Remove: `src/cmd/config.ts`, `src/cmd/config-helpers.ts`
- Modify: `src/cmd/index.ts`, `tests/cli.test.ts`
- Add/Modify tests: `tests/cli.test.ts` (new assertion), delete `tests/cmd/config*.test.ts`
- Docs: `README.md`, `README.zh-cn.md`, `README.ja.md`
