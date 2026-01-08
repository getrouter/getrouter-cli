# GetRouter CLI

getrouter.dev 的 CLI —— 用于管理 API key、订阅，并配置 vibecoding 工具。

[English](README.md) | 简体中文 | [日本語](README.ja.md)

## 依赖

- Node.js >= 18
- Bun >= 1.3.5（开发）

## 安装

若已发布到 npm：

使用 npm

```bash
npm install -g @getrouter/getrouter-cli
# 或
npx @getrouter/getrouter-cli --help
```

使用 bun

```bash
bun add -g @getrouter/getrouter-cli
# 或
bunx @getrouter/getrouter-cli --help
```

本地构建：

```bash
bun install
bun run build
```

## 快速开始

- `getrouter login` — 登录并完成设备码授权
- `getrouter keys` — 列出 API key（创建/更新/删除为交互式）
- `getrouter codex` — 配置 Codex（写入 `~/.codex/config.toml` + `~/.codex/auth.json`）

## 登录

设备码式登录：

```bash
getrouter login
```

按提示打开浏览器完成确认，CLI 会轮询直到拿到 token。
即使已登录，也可再次执行 `getrouter login`，会用新 token 覆盖本地 auth.json。

## 常用命令

- `getrouter login` — 设备码登录
- `getrouter logout` — 退出并清除本地 token
- `getrouter status` — 查看登录与订阅状态
- `getrouter keys` — 列出/创建/更新/删除 API key
- `getrouter usages` — 查看最近 7 天使用量（图表 + 表格）
- `getrouter codex` — 配置 Codex（config.toml + auth.json）
- `getrouter claude --install` — 安装 Anthropic 兼容环境变量

说明：

- `getrouter keys` 默认列出，创建/更新/删除会交互提问。
- `getrouter status` 会汇总登录与订阅信息，但不会展示 token。

## 环境配置

`getrouter codex` 写入 Codex 配置文件（不修改 shell 环境变量）。

```bash
getrouter codex
```

如需移除 Codex 配置/认证中的 GetRouter 条目：

```bash
getrouter codex uninstall
```

写入文件（codex）：

- `~/.codex/config.toml`（model + reasoning + provider 设置）
- `~/.codex/auth.json`（OPENAI_API_KEY）
- `~/.getrouter/codex-backup.json`（用于 `getrouter codex uninstall` 的备份；卸载后会删除）

`getrouter claude` 写入 Anthropic 兼容环境变量到 `~/.getrouter/env.sh`（或 `env.ps1`）。

```bash
getrouter claude --install
```

可选参数（仅 claude）：

- `--install`：写入 shell rc（追加 `source ~/.getrouter/env.sh`），安装 `claude` 自动 source 的 hook，并尝试立即生效；首次需要重新加载 shell（或 `source ~/.zshrc`）

写入变量（claude）：

```
ANTHROPIC_BASE_URL=https://api.getrouter.dev/claude
ANTHROPIC_API_KEY=<consumer api key>
```

## 配置与文件

默认目录：`~/.getrouter`（可用 `GETROUTER_CONFIG_DIR` 覆盖）

- `config.json`：CLI 配置
- `auth.json`：token
- `env.sh` / `env.ps1`：环境变量

如需修改配置，请直接编辑 `~/.getrouter/config.json`。

## 开发

- `bun install` — 安装依赖
- `bun run dev -- --help` — 本地运行 CLI 并查看帮助
- `bun run format` — 使用 Biome 格式化并检查代码
- `bun run test` — 运行测试
- `bun run typecheck` — 运行 TypeScript 类型检查
