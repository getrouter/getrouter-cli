# getrouter CLI 设计（v1）

日期：2026-01-01  
状态：已确认

## 背景与目标
- 面向 getrouter.dev 用户提供本地 CLI，覆盖 API Key 管理、订阅查询与自动配置 Codex/Claude 环境。
- 与现有 dashboard API 保持一致，减少接口漂移与重复维护成本。
- 默认人类可读输出，支持 `--json` 供脚本自动化。

## 非目标（v1）
- 不支持组织/工作区切换（未来版本再做）。
- 不接入 admin API、账单明细、provider/model 写操作。
- 设备码 OAuth 流程等待后端接口就绪后再开放。

## 需求与功能范围
- 登录/登出/状态：GitHub OAuth（浏览器回调 + 设备码扩展点）。
- API Key 管理：Consumer 多 key 的 list/create/update/delete/get。
- 订阅与计划：当前订阅、计划列表。
- 只读资源：模型列表、供应商列表、当前用户信息。
- 环境配置：生成 `~/.getrouter/` 配置与可选 shell 注入，支持 Codex/Claude。

## 方案选型
**推荐**：复用由 proto 生成的 TypeScript HTTP client（dashboard 同源），CLI 仅封装配置/鉴权/输出层。  
**理由**：与后端一致、类型稳定、交付最快。

## 架构与模块
```
cmd/        命令与交互（login/keys/subscription/setup）
core/
  auth/     OAuth 流程、token 刷新与存储
  config/   ~/.getrouter 读写、权限、脱敏
  output/   表格输出、--json、错误格式化
api/        统一 requestHandler + 生成 client
templates/  env.sh / env.ps1 模板
```

## 命令设计（建议）
- `getrouter auth login|logout|status`
- `getrouter keys list|create|update|delete|get`
- `getrouter subscription show`
- `getrouter plans list`
- `getrouter models list`
- `getrouter providers list`
- `getrouter user current`
- `getrouter setup env [--shell zsh|bash|fish|pwsh]`
- `getrouter config get|set`

## 认证与 Token
- 访问管理 API 统一使用 `Authorization: Bearer <access_token>`。
- token 保存于 `~/.getrouter/auth.json`（明文），文件权限 *nix 600。
- access 过期后尝试 refresh；刷新失败则提示重新登录。
- 设备码流程待后端完成后接入（命令入口可先预留）。

## API 映射（当前 dashboard HTTP）
管理 API 前缀：`https://getrouter.dev/v1`  
注：生成 client 的 path 已包含 `v1/...`，CLI 建议配置 `api_base=https://getrouter.dev` 以避免双 `v1`。

- OAuth Connect：`GET /v1/dashboard/identities/connect?type=GITHUB`
- OAuth Callback：`GET /v1/dashboard/identities/GITHUB/callback?code=...&state=...`
- 当前用户：`GET /v1/dashboard/users/current`
- 订阅：`GET /v1/dashboard/subscriptions/current`
- 计划列表：`GET /v1/dashboard/plans`
- Consumer：
  - `GET /v1/dashboard/consumers`
  - `GET /v1/dashboard/consumers/:id`
  - `POST /v1/dashboard/consumers/create`
  - `PUT /v1/dashboard/consumers/update?updateMask=...`
  - `DELETE /v1/dashboard/consumers/:id`
- 模型列表：`GET /v1/dashboard/models`
- 供应商列表：`GET /v1/dashboard/providers`

## 配置与环境变量
目录统一在 `~/.getrouter/`：
- `auth.json`：token 与过期时间
- `config.json`：API base、默认 consumer 等
- `env.sh` / `env.ps1`：可选环境变量脚本

环境变量（用于 Codex/Claude）：
- `OPENAI_BASE_URL=https://api.getrouter.dev/v1`
- `OPENAI_API_KEY=<consumer api key>`
- `ANTHROPIC_BASE_URL=https://api.getrouter.dev/v1`
- `ANTHROPIC_API_KEY=<consumer api key>`

## 输出格式
- 默认人类可读（表格/摘要）。
- `--json` 输出结构化数据，错误也保持 JSON（code/message/details/status）。
- 默认脱敏 token 与 API key；必要时提供 `--show-secret` 明示。

## 错误处理与重试
- 统一错误包装：`code/message/details/status`。
- 仅对幂等 GET 做一次指数退避重试。
- 401/403 明确提示 `getrouter auth login`。

## 测试策略
- 单测：配置读写、URL 拼装、错误映射、脱敏、输出格式。
- 集成：mock server 或 staging（若未来提供）。

## 发布与分发
- npm 包（`npx getrouter` 或全局安装）。
- GitHub Releases 提供平台说明与安装指引。

## 待确认/风险
- refresh token 的字段名、过期策略与刷新接口。
- 设备码 OAuth 的具体 endpoint 与回调协议。
- 管理 API base 与 `v1` 路径的最终规范（避免双重 `v1`）。
