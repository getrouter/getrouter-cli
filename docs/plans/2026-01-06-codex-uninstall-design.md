# Codex Uninstall Design

## Goal
Add a `getrouter codex uninstall` subcommand that removes only getrouter-managed Codex configuration, without touching unrelated user settings.

## Scope
- Remove the `[model_providers.getrouter]` section from `~/.codex/config.toml`.
- Remove `model`, `model_reasoning_effort`, and `model_provider` only when `model_provider` is set to `"getrouter"`.
- Remove `OPENAI_API_KEY` from `~/.codex/auth.json`.
- Preserve all other keys, providers, comments, and formatting as much as possible.

## CLI Shape
- Keep the existing `getrouter codex` interactive flow unchanged.
- Add `getrouter codex uninstall` as a non-interactive subcommand.
- The uninstall action reports per-file status: removed, no-op, or missing.

## Data Flow
1. Resolve `~/.codex` via `os.homedir()`.
2. For each file:
   - If missing, log and continue.
   - Read content, apply a removal helper, and write back only if changed.
3. Abort with a clear error if parsing fails; avoid partial writes.

## Implementation Notes
- Extend `src/core/setup/codex.ts` with:
  - `removeCodexConfig(content)` for TOML line removal.
  - `removeAuthJson(data)` for JSON key removal.
- Update `src/cmd/codex.ts` to register the uninstall subcommand.

## Testing
- Add command tests for uninstall in `tests/cmd/codex.test.ts`:
  - Removes getrouter entries but keeps other providers/keys.
  - No-op when getrouter entries do not exist.
  - Root keys only removed when `model_provider == "getrouter"`.
