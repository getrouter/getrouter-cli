# Models & Keys Fuzzy Selection Design

## Goals
- Provide an interactive, fzf-like fuzzy search for `models` and `keys` when run without `list`.
- Keep `models list` and `keys list` as non-interactive, script-friendly outputs.
- Preserve existing CLI style: concise tables, small emoji accents, and predictable error handling.
- Copy selected model ID to the clipboard when possible (best-effort, cross-platform fallback).

## Non-Goals
- No new dependencies (keep using `prompts`).
- No multi-column preview panes or advanced fzf features.
- No server-side filtering for now (no `--filter` on models in this iteration).

## Command Behavior
### models
- `getrouter models` (TTY): interactive fuzzy search.
  - Prompt: `🔎 Search models`.
  - User selects a model; CLI prints a single-row detail table
    (`ID / NAME / AUTHOR / ENABLED / UPDATED_AT`).
  - CLI attempts to copy `id` to clipboard and prints `📋 Copied model id` on success.
- `getrouter models` (non-TTY): same as `models list`.
- `getrouter models list`: non-interactive list table, with header `🧠 Models`.
- Empty results: `😕 No models found`.

### keys
- `getrouter keys` (TTY): interactive fuzzy search.
  - Prompt: `🔎 Search keys`.
  - User selects a key; CLI prints a single-row detail table
    (same columns as current output, with API key redaction).
  - CLI attempts to copy the full API key to clipboard and prints
    `📋 Copied API key` on success.
- `getrouter keys` (non-TTY): same as `keys list`.
- `getrouter keys list`: non-interactive list table (existing behavior).
- Empty results: `😕 No keys found` (reuse existing error path if appropriate).

## Data Flow
- `models list` and `models` read from `ModelService.ListModels`.
- `keys list` and `keys` read from `ConsumerService.ListConsumers`.
- Interactive flow always starts from list data, then filters client-side.

## Fuzzy Matching
- Use `prompts` `autocomplete` with a `suggest` callback.
- Implement a small fuzzy scorer (in `src/core/interactive/fuzzy.ts`) to:
  - Normalize to lowercase.
  - Score by ordered subsequence match (simple, fast).
  - Sort by best score, then by name.
- The `suggest` callback returns top N items (e.g., 50) for responsiveness.

## Clipboard Handling
- Best-effort copy using platform tools:
  - macOS: `pbcopy`.
  - Linux: `wl-copy`, fallback to `xclip -selection clipboard`.
- If none available, skip copying and print the model id/API key for manual copy.
- Implement as `copyToClipboard(text): Promise<boolean>` in `src/core/interactive/clipboard.ts`.

## Error Handling
- If not TTY for interactive commands, fall back to list output.
- If selection is cancelled, exit quietly with no error.
- If list API returns empty, show friendly message and exit with code 0.

## Testing Plan
- Add new tests for:
  - `models` (non-TTY) behaves like `models list`.
  - `models` (TTY) uses interactive flow and prints selection output.
  - `keys` (TTY) interactive selection prints detail output.
  - Clipboard copy is attempted and failures do not crash (models + keys).
- Mock `prompts` to simulate selection and `child_process` for clipboard.

## Files To Touch
- `src/cmd/models.ts` (new list + interactive behavior).
- `src/cmd/index.ts` (register models commands).
- `src/core/interactive` (new fuzzy + clipboard helpers).
- `src/cmd/keys.ts` and `src/core/interactive/keys.ts` (wire fuzzy when no subcommand).
- `tests/cmd/models.test.ts` (new).
- Update existing tests for keys if behavior changes.
