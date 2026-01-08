# getrouter CLI Keys & Subscription 设计（v1）

日期：2026-01-02  
状态：已确认

## 背景
- `keys` 命令映射 dashboard `consumer` 资源，用于管理 API key。
- `subscription show` 用于展示当前订阅信息。
- 复用 dashboard 生成的 TypeScript client，避免路径与类型漂移。

## 方案选型
**采用**：复用 dashboard 生成的 TS client（ConsumerService/SubscriptionService），CLI 仅做参数解析与输出层。

## 命令设计
### Keys（consumer）
- `getrouter keys list`
- `getrouter keys get <id>`
- `getrouter keys create --name <name> [--enabled <true|false>]`
- `getrouter keys update <id> --name <name> --enabled <true|false>`
- `getrouter keys delete <id>`

约定：
- `list` 暂不支持分页参数（使用服务端默认）。
- `update` 仅允许更新 `name` 与 `enabled`。未提供任何可更新字段时报错。
- `apiKey` 默认脱敏展示，仅在 `--show-secret` 下明文。
- `create` 成功后默认脱敏展示 `apiKey`，并提示“请妥善保存 API Key”。

### Subscription
- `getrouter subscription show`

默认输出字段：
- `plan.name`, `status`, `startAt`, `endAt`, `plan.requestPerMinute`, `plan.tokenPerMinute`
- `--json` 输出原始结构

## 组件与数据流
- `core/api`：包装生成 client（ConsumerService/SubscriptionService）。
- `core/http`：统一鉴权与错误封装（Authorization: Bearer）。
- `cmd/keys`/`cmd/subscription`：参数解析、调用 `core/api`。
- 输出层：默认人类可读，`--json` 输出结构化 JSON。

## 错误处理
- 401/403：提示 `getrouter auth login`。
- `subscription show` 若 404/空响应，提示“未订阅”。
- 其他错误：默认输出 message；JSON 模式输出 `{code,message,details,status}`。

## 测试策略
- `core/api`/adapter：验证路径、方法、请求体与 `updateMask` 生成。
- `cmd/keys`：list/create/update/delete/get 输出与脱敏/`--show-secret` 行为。
- `cmd/subscription`：正常与 404 场景，JSON 与默认输出。

## 备注
- `apiBase` 默认 `https://getrouter.dev`，生成 client path 已含 `v1/...`。
