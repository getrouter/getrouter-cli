# CLI 简化方案设计

## 目标
- 将 CLI 命令体系简化为一级命令，替换原有二级命令（auth/keys/subscription/setup 等）。
- 输出美化，必要时使用 emoji，保留一致性与可读性。
- 兼容新的 usages API，并提供最近 7 天聚合可视化。

## 命令体系
- `getrouter login` / `getrouter logout`
  - 替代 `getrouter auth login/logout`。
- `getrouter keys`
  - 进入交互菜单，支持：列表 / 查看 / 创建 / 更新 / 删除 / 退出。
  - 删除需 y/N 二次确认；完成某操作后回到菜单。
- `getrouter usages`
  - 默认展示最近 7 天按天聚合使用量，堆叠柱状图 + 表格。
- `getrouter status`
  - 统一展示登录状态 + 订阅状态。
  - 登录仅显示状态与过期时间，不展示 token。
- `getrouter codex` / `getrouter claude`
  - 取代 `setup env`，仅保留 `--install`。
  - codex 只写 OpenAI 变量，claude 只写 Anthropic 变量。
  - 多 key 时进入交互选择。
- `getrouter config`
  - 简化为：`getrouter config` 显示全部；`getrouter config <key> <value>` 设置。
  - 去掉 `--json`。

移除：`models/plans/providers/user/setup` 以及旧的二级命令入口。

## 输出与交互
### status
- 以“状态卡片”风格输出两块：登录状态 + 订阅状态。
- 登录块：status + expiresAt（不显示 token）。
- 订阅块：plan / status / startAt / endAt / requestPerMinute / tokenPerMinute。
- 无订阅时提示“无有效订阅”。

### usages
- 接口：`GET v1/dashboard/usages`（pageSize/pageToken）。
- 拉取策略：逐页拉取，按本地时区聚合日期，直到 7 天或数据耗尽。
- 输出包含：
  1) 堆叠柱状图（默认显示，input/output 分段）
  2) 表格（日、input/output/total tokens、请求数若可得）
- 不区分 TTY/管道，默认都显示图 + 表。

### keys
- 交互菜单：列表 / 查看 / 创建 / 更新 / 删除 / 退出。
- 查看/删除：无 id 时进入选择列表。
- 更新仅支持 `name` 和 `enabled`。
- 删除需 y/N 确认。

## 环境配置（codex/claude）
- 仅保留 `--install`。
- 写入 `~/.getrouter/env.sh` 或 `env.ps1`，Base URL 固定 `https://api.getrouter.dev/v1`。
- `--install` 时：
  - 自动判断 shell（zsh/bash/fish/pwsh）写入 rc。
  - **立即生效策略**：
    1) 更新当前 CLI 进程的 `process.env`；
    2) best‑effort 执行一次 `source` / `. <path>`（PowerShell 使用 `. <path>`）。
  - 若 source 失败，提示用户手动执行。

## 实现注意
- `usages` 需要更新 CLI 的生成代码以引入 `UsageService`。
- 新命令与输出均移除 `--json` 选项，仅保留美化输出。
