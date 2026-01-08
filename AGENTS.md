# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains CLI source code (TypeScript). Commands live in `src/cmd/`, shared logic in `src/core/`, and generated dashboard clients in `src/generated/`.
- `tests/` mirrors the source structure with Vitest test suites (e.g., `tests/cmd/`, `tests/core/`).
- `docs/plans/` holds design and implementation plan documents for recent features.
- Config and runtime files are written under `~/.getrouter` (or `GETROUTER_CONFIG_DIR`).

## Build, Test, and Development Commands

- `bun run dev -- --help`: run the CLI in dev mode via `tsx`.
- `bun run build`: bundle the CLI to `dist/` with `tsdown`.
- `bun run format`: format and lint code with Biome.
- `bun run test`: run the full Vitest suite.
- `bun run test -- tests/path/to/file.test.ts`: run a targeted test file.
- `bun run typecheck`: run TypeScript type checks without emitting files.

## Coding Style & Naming Conventions

- TypeScript with 2-space indentation and double quotes, matching existing files.
- File naming: kebab-case for docs, `*.test.ts` for tests, and `index.ts` for module entry points.
- Prefer small helpers in `src/core/` and command wiring in `src/cmd/`.
- Use Biome via `bun run format`; keep style consistent with nearby code.

## Import Patterns & Module Organization

- Use ES modules with `import type` for type-only imports.
- Generated API clients imported from `src/generated/router/` with type-only imports.
- Core utilities organized under `src/core/` with domain-specific folders (auth/, config/, http/, etc.).
- Commands import helpers from `src/core/` and CLI utilities from `src/cli.ts`.

## TypeScript Patterns

- Strict typing enabled; define interfaces for all config and data structures.
- Generic types for API responses (`ApiResponse<T>`) and HTTP handlers.
- Union types for status codes and error types.
- Prefer `interface` over `type` for object shapes unless you need union types.

## Error Handling Patterns

- Custom `ApiError` class with `createApiError(status, message)` helper.
- Export structured error objects with `code`, `message`, and `requestId` fields.
- HTTP methods should return data and throw `ApiError` for failures.
- Use try/catch blocks in commands and exit gracefully with `process.exit(1)`.

## CLI Development Patterns

- Use Commander.js: `.command()`, `.description()`, `.option()`, `.action()`.
- Commands are async functions that accept options object.
- Use `consoleLog()` helper from `src/cli.ts` for consistent output.
- Add emojis to command output for visual distinction.
- Use `checkAuthenticated()` helper for commands requiring auth.

## Testing Guidelines

- Test framework: Vitest.
- Test naming: `*.test.ts` under `tests/` with `describe/it` blocks.
- Mock external dependencies with `vi.mock()` and `vi.hoisted()`.
- Use temp directory helpers (`mkdtemp`, `rimraf`) for file system tests.
- Test both success and error paths for commands.
- Run targeted tests before full suite: `bun run test -- tests/path/to/file.test.ts`.
- After modifying, always run `bun run test && bun run lint && bun run format`.

## Configuration & Security

- Config stored in `~/.getrouter/` or `GETROUTER_CONFIG_DIR`.
- Auth tokens in `auth.json` with 0600 permissions.
- Use `fsConfig` helper for config file operations.
- Redact sensitive data in logs and CLI output.
- Validate configuration with Zod schemas where applicable.

## Commit & Pull Request Guidelines

- Commit messages follow conventional prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- Keep commits scoped and focused (tests + implementation together when possible).
- PRs should include a concise summary and test plan (commands run).
- Screenshots are usually unnecessary for CLI changes.