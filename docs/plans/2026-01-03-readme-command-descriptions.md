# README Command Descriptions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-command explanations in README quick start/common commands/development sections (English + Chinese).

**Architecture:** Convert command code blocks to bullet lists with inline command + short description; keep existing notes/options intact.

**Tech Stack:** Markdown.

### Task 1: Update English sections in README

**Files:**
- Modify: `README.md`

**Step 1: Replace English Quick Start block with a described list**

```md
### Quick Start
- `getrouter auth login` — sign in via device flow
- `getrouter keys list` — view API keys you can use
- `getrouter setup env` — generate env exports for vibecoding tools
```

**Step 2: Replace English Common Commands block with a described list**

```md
### Common Commands
- `getrouter auth login` — log in via device flow
- `getrouter auth logout` — clear local tokens
- `getrouter auth status` — show login status and token expiry
- `getrouter keys list` — list API keys
- `getrouter keys create` — create a new API key
- `getrouter keys update` — update key name/metadata
- `getrouter keys delete` — delete an API key
- `getrouter keys get` — show a single key (use `--show-secret` to reveal full token)
- `getrouter subscription show` — show current subscription/plan
- `getrouter setup env [--key <id>] [--print] [--install] [--shell <zsh|bash|fish|pwsh>]` — generate or print env exports for OpenAI/Anthropic-compatible tools
- `getrouter config get` — read CLI config
- `getrouter config set` — update CLI config
- `getrouter plans list` — list available plans
- `getrouter models list` — list available models
- `getrouter providers list` — list supported providers
- `getrouter user current` — show current account info
```

**Step 3: Replace English Development block with a described list**

```md
### Development
- `npm install` — install dependencies
- `npm run dev -- --help` — run the local CLI and show help
- `npm test` — run the test suite
```

### Task 2: Update Chinese sections in README

**Files:**
- Modify: `README.md`

**Step 1: Replace Chinese Quick Start block with a described list**

```md
### 快速开始
- `getrouter auth login` — 登录并完成设备码授权
- `getrouter keys list` — 查看已有 API key
- `getrouter setup env` — 生成供工具加载的环境变量
```

**Step 2: Replace Chinese Common Commands block with a described list**

```md
### 常用命令
- `getrouter auth login` — 设备码登录
- `getrouter auth logout` — 退出并清除本地 token
- `getrouter auth status` — 查看登录状态与过期时间
- `getrouter keys list` — 列出 API key
- `getrouter keys create` — 创建 API key
- `getrouter keys update` — 更新 key 名称/信息
- `getrouter keys delete` — 删除 API key
- `getrouter keys get` — 查看指定 key（配合 `--show-secret` 显示完整 token）
- `getrouter subscription show` — 查看订阅信息
- `getrouter setup env [--key <id>] [--print] [--install] [--shell <zsh|bash|fish|pwsh>]` — 生成或输出 OpenAI/Anthropic 兼容的环境变量
- `getrouter config get` — 读取 CLI 配置
- `getrouter config set` — 修改 CLI 配置
- `getrouter plans list` — 查看可用套餐
- `getrouter models list` — 查看可用模型
- `getrouter providers list` — 查看可用供应商
- `getrouter user current` — 查看当前账号信息
```

**Step 3: Replace Chinese Development block with a described list**

```md
### 开发
- `npm install` — 安装依赖
- `npm run dev -- --help` — 本地运行 CLI 并查看帮助
- `npm test` — 运行测试
```

### Task 3: Verify and commit

**Step 1: Sanity-check README formatting**

Open `README.md` and ensure headings and lists render correctly.

**Step 2: Tests**

No tests required for README-only changes.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add command descriptions to README"
```
