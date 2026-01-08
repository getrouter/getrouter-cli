# Env Hook Auto-Source Design

## Goals
- Ensure `getrouter codex` / `getrouter claude` automatically `source` the generated env file in the **current shell** after successful execution.
- Install a shell hook on `--install` that wraps `getrouter` and performs the auto-source step.
- Keep existing behavior (env file generation, rc insertion) intact and best-effort.

## Non-Goals
- No new dependencies.
- No attempt to force the current parent shell to reload rc automatically (shell limitation).
- No new CLI flags in this iteration (use existing `--install`).

## Behavior
- `getrouter codex --install` / `getrouter claude --install` will:
  - Write the env file (`env.sh` or `env.ps1`) as today.
  - Write a shell hook file under `~/.getrouter/` (or `GETROUTER_CONFIG_DIR`).
  - Append a `source`/dot-source line for the hook into the user’s rc file (idempotent).
- Once the hook is loaded (by reloading rc or opening a new shell), any subsequent `getrouter codex` or `getrouter claude` call will:
  - Run the real CLI command.
  - If exit code is 0, `source` the env file to update variables in the current shell.

## Hook Format
- **bash/zsh**: `hook.sh` with a `getrouter()` wrapper that calls `command getrouter` to avoid recursion.
- **fish**: `hook.fish` defining a `getrouter` function with `command getrouter`.
- **pwsh**: `hook.ps1` defining `function getrouter { & getrouter @args; ...; . $envPath }`.
- Hook resolves config dir dynamically at runtime:
  - `GETROUTER_CONFIG_DIR` if set, else `~/.getrouter`.
  - Env file path: `env.sh` for sh/fish, `env.ps1` for pwsh.

## Error Handling
- Hook is best-effort and silent on failures.
- Auto-source only runs when the CLI exits successfully.

## Testing Plan
- Update `tests/core/setup/env.test.ts` to cover hook path + hook rendering output.
- Update `tests/cmd/codex.test.ts` and `tests/cmd/claude.test.ts` to assert:
  - Hook file is written.
  - Rc file includes hook source line.

## Files To Touch
- `src/core/setup/env.ts`
- `src/cmd/env.ts`
- `tests/core/setup/env.test.ts`
- `tests/cmd/codex.test.ts`
- `tests/cmd/claude.test.ts`
- `README.md`
- `README.zh-cn.md`
- `README.ja.md`
