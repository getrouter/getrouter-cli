# GetRouter CLI

[![CI](https://github.com/getrouter/getrouter-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/getrouter/getrouter-cli/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@getrouter/getrouter-cli)](https://www.npmjs.com/package/@getrouter/getrouter-cli)
[![npm downloads](https://img.shields.io/npm/dm/@getrouter/getrouter-cli)](https://www.npmjs.com/package/@getrouter/getrouter-cli)
[![node](https://img.shields.io/node/v/@getrouter/getrouter-cli)](https://www.npmjs.com/package/@getrouter/getrouter-cli)
[![bun](https://img.shields.io/badge/bun-1.3.5-000?logo=bun&logoColor=white)](https://bun.sh)

CLI for getrouter.dev — manage API keys, subscriptions, and configure vibecoding tools.

English | [简体中文](README.zh-cn.md) | [日本語](README.ja.md)

## Requirements

- Node.js >= 18
- Bun >= 1.3.5 (for development)

## Install

If published to npm:

With npm

```bash
npm install -g @getrouter/getrouter-cli
# or
npx @getrouter/getrouter-cli --help
```

With bun

```bash
bun add -g @getrouter/getrouter-cli
# or
bunx @getrouter/getrouter-cli --help
```

Local build:

```bash
bun install
bun run build
```

## Quick Start

- `getrouter login` — sign in via device flow
- `getrouter keys` — list API keys (create/update/delete are interactive)
- `getrouter codex` — configure Codex (writes `~/.codex/config.toml` + `~/.codex/auth.json`)

## Auth

Device-style login:

```bash
getrouter login
```

Follow the printed URL in your browser, then the CLI will poll until it receives tokens.
Re-running `getrouter login` will overwrite the local auth state with new tokens.

## Common Commands

- `getrouter login` — log in via device flow
- `getrouter logout` — clear local tokens
- `getrouter status` — show login + subscription status
- `getrouter keys` — list/create/update/delete API keys
- `getrouter usages` — show the last 7 days of usage (chart + table)
- `getrouter codex` — configure Codex (config.toml + auth.json)
- `getrouter claude --install` — install Anthropic-compatible env vars

Notes:

- `getrouter keys` lists keys by default; create/update/delete prompt for input.
- `getrouter status` summarizes auth and subscription without printing tokens.

## Environment Setup

`getrouter codex` writes Codex configuration files (no shell env changes).

```bash
getrouter codex
```

To remove GetRouter entries from Codex config/auth:

```bash
getrouter codex uninstall
```

Files written (codex):

- `~/.codex/config.toml` (model + reasoning + provider settings)
- `~/.codex/auth.json` (OPENAI_API_KEY)
- `~/.getrouter/codex-backup.json` (backup for `getrouter codex uninstall`; deleted on uninstall)

`getrouter claude` writes Anthropic-compatible env vars to `~/.getrouter/env.sh` (or `env.ps1`).

```bash
getrouter claude --install
```

Option (claude only):

- `--install`: append `source ~/.getrouter/env.sh` to your shell rc, install an auto-source hook for `claude`, and try to load it immediately. Reload your shell (or `source ~/.zshrc`) once to activate the hook.

Variables written (claude):

```
ANTHROPIC_BASE_URL=https://api.getrouter.dev/claude
ANTHROPIC_API_KEY=<consumer api key>
```

## Config & Files

Default config dir: `~/.getrouter` (override with `GETROUTER_CONFIG_DIR`)

- `config.json`: CLI config
- `auth.json`: access/refresh tokens
- `env.sh` / `env.ps1`: environment variables

Edit `~/.getrouter/config.json` directly to update CLI settings.

## Development

- `bun install` — install dependencies
- `bun run dev -- --help` — run the local CLI and show help
- `bun run format` — format and lint code with Biome
- `bun run test` — run the test suite
- `bun run typecheck` — run TypeScript type checks

[![Download History (last 30 days)](https://quickchart.io/chart/render/zf-3cc45f8d-a7de-4553-bdfa-877c4592ce59)](https://www.npmjs.com/package/@getrouter/getrouter-cli)
