# getrouter CLI setup env 设计

日期：2026-01-02

## 目标

为 CLI 提供“环境自动配置”能力，生成适用于 Codex/Claude 等 vibecoding 工具的环境变量配置，并支持可选安装到 shell rc。

## 核心流程（默认）

- 命令：`getrouter setup env`
- 默认行为：
  1. 选择一个 API key（优先 `--key <id>`，否则进入交互选择；非 TTY 且无 key 时报错）。
  2. 生成并写入 `~/.getrouter/env.sh`（或 `env.ps1`）。
  3. 打印 `source ~/.getrouter/env.sh`（或 PowerShell 使用 `$PROFILE` 的指引）。

## 输出内容

统一写入以下变量（同一个 key 用于 OpenAI 与 Anthropic）：
- `OPENAI_BASE_URL=https://api.getrouter.dev/v1`
- `OPENAI_API_KEY=<consumer api key>`
- `ANTHROPIC_BASE_URL=https://api.getrouter.dev/v1`
- `ANTHROPIC_API_KEY=<consumer api key>`

## 可选参数

- `--key <id>`：直接使用指定 key，跳过交互。
- `--print`：只输出 env 内容到 stdout，不落盘。
- `--install`：追加 `source ~/.getrouter/env.sh` 到 shell rc（需确认并避免重复）。
- `--shell <zsh|bash|fish|pwsh>`：指定 rc 类型（不传则按 `SHELL` 推断）。
- `--json`：输出结构化结果（路径、选中 key、是否安装）。

## 安全与兼容性

- 写入的 env 文件权限为 0600（与 `auth.json` 一致）。
- `--install` 前需确认，防止擅自修改用户配置。
- 自动检测 rc 文件，若不存在则提示用户手动操作。
- PowerShell 使用 `$env:VAR="..."` 语法。

## 错误处理

- 未登录或无法获取 key：提示 `getrouter auth login` 或 `getrouter keys create`。
- 非 TTY 且未提供 `--key`：报错提示缺少 key。
- 远端请求失败：直接报错并退出。

## 交互示例

```
$ getrouter setup env
To configure your shell, run:
source ~/.getrouter/env.sh
```

`--print` 示例：
```
$ getrouter setup env --print
export OPENAI_BASE_URL=...
export OPENAI_API_KEY=...
...
```

## 影响范围

- 新增 `setup` 命令模块
- 新增 env 生成/写入逻辑
- 复用 keys 交互选择逻辑

