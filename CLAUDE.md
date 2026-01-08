# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun install          # Install dependencies
bun run dev -- --help  # Run local CLI with args
bun run build        # Build with tsdown

# Quality
bun run test         # Run all tests
bun run test -- tests/cmd/auth.test.ts  # Run single test file
bun run lint         # Check with Biome
bun run format       # Format with Biome
bun run typecheck    # TypeScript type checking
```

## Architecture

### Entry Flow
`src/bin.ts` → `src/cli.ts` (creates Commander program) → `src/cmd/index.ts` (registers all commands)

### Directory Structure

- `src/cmd/` - Command handlers (auth, keys, codex, claude, status, usages, models)
- `src/core/` - Core logic modules:
  - `api/client.ts` - Creates typed API service clients from generated code
  - `auth/` - Auth status checking and device flow polling
  - `config/` - JSON config/auth file read/write (`~/.getrouter/`)
  - `http/` - HTTP request layer with auth headers, URL building, error handling
  - `interactive/` - TTY prompts for user input (keys selection, codex setup)
  - `output/` - Table rendering and usage chart formatting
  - `setup/` - Environment file writers (codex config, claude env vars)
- `src/generated/` - Protobuf-generated TypeScript HTTP clients (do not edit manually)

### API Client Pattern
Commands use `createApiClients({})` to get typed service clients (authService, consumerService, subscriptionService, usageService, modelService). These wrap generated protobuf-ts-http clients with auth token injection via `requestJson()`.

### Config Files
Default config directory: `~/.getrouter/` (override with `GETROUTER_CONFIG_DIR`)
- `config.json` - CLI settings including `apiBase`
- `auth.json` - OAuth tokens (accessToken, refreshToken, expiresAt)

### Testing Patterns
Tests use vitest and mock `createApiClients` and service dependencies. Use `process.env.GETROUTER_CONFIG_DIR` with temp directories for isolation.

### Key Environment Variables
- `GETROUTER_CONFIG_DIR` - Override config directory location
- `GETROUTER_AUTH_COOKIE` / `KRATOS_AUTH_COOKIE` - Custom auth cookie name
