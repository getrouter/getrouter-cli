# getrouter CLI 设备码式登录设计

日期：2026-01-02

## 背景与目标

现有 CLI 的 `auth login` 仅提示 OAuth 未就绪。根据最新 auth 流程，CLI 需改为类似 tailscale 的设备码式登录：
- CLI 本地生成 `auth_code`（13 位小写 base32）
- 打开浏览器访问 `https://getrouter.dev/auth/{auth_code}`
- CLI 轮询 `POST /v1/dashboard/auth/authorize`，body `{ code: auth_code }`
- 成功返回 `AuthToken` 后写入 `~/.getrouter/auth.json`

## 关键流程

1. `auth login` 生成 `auth_code`（13 位小写 base32）。
2. 输出登录 URL，并尝试自动打开浏览器（macOS: `open`；Windows: `start`；Linux: `xdg-open`）。失败不阻断流程。
3. CLI 进入轮询：
   - 请求：`POST /v1/dashboard/auth/authorize`，body `{ code: auth_code }`
   - 成功：HTTP 200 + `AuthToken`
   - 未确认：HTTP 404（AUTH not found）→ 继续轮询
   - 已兑换：HTTP 400（code already exchanged）→ 失败退出
   - 过期：HTTP 403（token expired）→ 失败退出
   - 其他 4xx/5xx：失败退出
4. 轮询策略：指数退避 1s → 2s → 4s → 8s → 10s（封顶），总超时 5 分钟。
5. 成功后写入 `auth.json`，并输出“登录成功”。
6. Ctrl+C 中断轮询并提示“已取消登录”。

## 数据与存储

- `AuthToken` 字段：`access_token`、`refresh_token`、`expires_at`。
- 写入位置：`~/.getrouter/auth.json` 或 `GETROUTER_CONFIG_DIR` 指定路径。
- 文件权限：`0600`（已有 `writeAuth` 逻辑覆盖）。

## 错误处理

- 404：视为“未确认”，继续轮询。
- 400：视为“已兑换”，提示重新登录。
- 403：视为“已过期”，提示重新登录。
- 其他状态：直接失败，提示重试。

## CLI 交互示例

```
To authenticate, visit:
https://getrouter.dev/auth/<auth_code>
Waiting for confirmation...
```

成功后：
```
登录成功
```

## 需要改动的模块

- `src/cmd/auth.ts`：实现设备码式登录流程。
- `src/core/auth/`：新增设备码登录辅助函数（生成 auth_code、打开浏览器、轮询）。
- `src/core/api/client.ts`：注入 `createAuthServiceClient`。
- `src/generated/router/dashboard/v1/index.ts`：确保包含 `AuthService.Authorize`（已生成）。
- 测试：新增/更新 `tests/cmd/auth.test.ts` 等。

## 测试建议

1. 轮询遇到 404 时继续，直到成功获取 token。
2. 400/403 立即失败退出。
3. 超时（5 分钟）后提示失败。
4. 成功时写入 `auth.json` 且权限正确。
5. 浏览器打开失败不影响轮询。

## 不在范围内

- OAuth callback / 旧流程保留。
- 后端接口改动。
