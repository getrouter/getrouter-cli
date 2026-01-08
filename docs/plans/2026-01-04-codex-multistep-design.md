# Codex Multi-step Config Design

## Goals
- Replace `getrouter codex` env output with a multi-step interactive flow.
- Support fuzzy search at each step (model, reasoning, key).
- Write `~/.codex/config.toml` with selected model, reasoning effort, and provider config.
- Write `~/.codex/auth.json` with `OPENAI_API_KEY` from selected key.
- Preserve other keys in existing config/auth files (merge, don’t clobber).

## Non-Goals
- Do not change `getrouter claude` behavior.
- No new dependencies (manual TOML merge).
- No non-interactive mode for codex (TTY required).

## Command Flow (TTY only)
1. **Model**: select from fixed list with descriptions and fuzzy search.
   - gpt-5.2-codex — Latest frontier agentic coding model.
   - gpt-5.1-codex-max — Codex-optimized flagship for deep and fast reasoning.
   - gpt-5.1-codex-mini — Optimized for codex. Cheaper, faster, but less capable.
   - gpt-5.2 — Latest frontier model with improvements across knowledge, reasoning and coding.
   - Prompt message includes: “Access legacy models by running codex -m <model_name> or in your config.toml”.
2. **Reasoning**: fuzzy select with display name + description.
   - Low → `low`
   - Medium (default) → `medium`
   - High → `high`
   - Extra high → `xhigh` (display name differs from stored value)
3. **Key**: fuzzy select existing API keys (reuse consumer list flow).
4. **Confirm**: show summary (model, reasoning, provider, key id/name) and ask for final confirm.

If any step is canceled, exit quietly with no writes.

## Output Files
### `~/.codex/config.toml`
Set/merge:
```
model = "<model>"
model_reasoning_effort = "<low|medium|high|xhigh>"
model_provider = "getrouter"

[model_providers.getrouter]
name = "getrouter"
base_url = "https://api.getrouter.dev/codex"
wire_api = "responses"
requires_openai_auth = true
```

### `~/.codex/auth.json`
Merge JSON and set:
```
{ "OPENAI_API_KEY": "<key>" }
```
Ensure permissions 0600 on non-Windows systems.

## Merge Strategy
- TOML: line-based update at root for `model`, `model_reasoning_effort`, `model_provider`.
- `[model_providers.getrouter]`:
  - If present, update/insert keys within that table.
  - If absent, append the table block.
- JSON: read existing, update only `OPENAI_API_KEY`.

## Error Handling
- Non-TTY: error “Interactive mode required…”
- Missing keys: error “No available API keys”.
- Write/parse failures: throw and exit with status 1.

## Testing Plan
- Update `tests/cmd/codex.test.ts` for multi-step flow and file writes.
- Add tests for TOML merge and auth.json merge.
- Validate reasoning value mapping (Extra high → xhigh).

## Files To Touch
- `src/cmd/codex.ts`
- `src/core/setup/codex.ts` (new)
- `src/core/interactive/codex.ts` (new)
- `tests/cmd/codex.test.ts`
- `README.*` (doc updates for codex behavior)
