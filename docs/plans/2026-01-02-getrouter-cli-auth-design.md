# getrouter CLI 认证设计（OAuth 未就绪占位）

日期：2026-01-02  
状态：已确认

## 背景
- getrouter OAuth/设备码流程仍在开发中，需要先提供 CLI 占位行为以保证体验一致与可预测。
- 当前阶段不写入虚假 token，避免误导用户或污染本地状态。

## 目标与范围（当前阶段）
- `auth login` 提示“OAuth 未就绪”，不写入 `auth.json`。
- `auth logout` 清理本地认证文件。
- `auth status` 做本地判断，输出“远端验证待开放”。
- 输出支持 `--json`，默认人类可读。

## 非目标（当前阶段）
- 不启动本地回调服务。
- 不与任何 OAuth/设备码接口通信。
- 不校验远端用户状态。

## 命令与交互
- `getrouter auth login`
  - 输出提示：OAuth 仍在开发中，暂不支持登录。
  - 不写入或修改 `~/.getrouter/auth.json`。
- `getrouter auth logout`
  - 删除或清空 `~/.getrouter/auth.json`。
  - 输出“已清除本地认证信息”。
- `getrouter auth status`
  - 读取 `auth.json`（如存在），检查字段完整性与过期时间。
  - 若缺失或过期：显示“未登录”。
  - 若完整且未过期：显示“已登录（仅本地验证，远端验证待开放）”。

## 存储与字段
- 认证文件：`~/.getrouter/auth.json`
- 结构：
  ```json
  {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": "2026-01-02T00:00:00Z",
    "tokenType": "Bearer"
  }
  ```
- `tokenType` 默认 `Bearer`（后续真实 OAuth 可覆盖）。
- `expiresAt` 使用 ISO8601 字符串。
- *nix 系统写入时强制 `0600` 权限；Windows 保持默认 ACL。

## 输出与脱敏
- 默认输出脱敏 token（仅显示前后 4 位）。
- 仅在 `--show-secret` 下展示完整 token。
- `--json` 输出结构化字段：`status`、`expiresAt`、`note`。

## 错误处理
- JSON 解析失败、无权限写入等：提示路径与修复建议，返回非零退出码。
- 远端校验未实现时，`auth status` 明确标注“远端验证待开放”。

## 测试策略
- 单测覆盖：
  - 状态判定（未登录/已登录/过期）。
  - `tokenType` 默认值与 `expiresAt` 解析。
  - `auth login` 只提示不落盘。
  - `auth logout` 清理文件。
- *nix 下断言 `0600`；Windows 仅断言写入成功。

## 未来接入 OAuth 的扩展点
- 登录流程：本地回调 + 浏览器打开 + 回调接口换 token。
- `auth status` 增加“远端验证”调用。
- `core/http` 可扩展 401 触发 refresh 并重试。
