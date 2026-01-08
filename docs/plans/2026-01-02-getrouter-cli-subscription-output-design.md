# getrouter CLI Subscription show 表格输出设计

日期：2026-01-02  
状态：已确认

## 目标
- `subscription show` 默认输出改为单行表格，与 `keys list/get` 风格一致。
- `--json` 行为不变。

## 输出格式
- 列顺序：`PLAN | STATUS | START_AT | END_AT | REQUEST_PER_MINUTE | TOKEN_PER_MINUTE`
- 数据来源：
  - `PLAN` → `plan.name`
  - `STATUS` → `status`
  - `START_AT` → `startAt`
  - `END_AT` → `endAt`
  - `REQUEST_PER_MINUTE` → `plan.requestPerMinute`
  - `TOKEN_PER_MINUTE` → `plan.tokenPerMinute`
- 空值显示 `-`；超长字段按 `renderTable` 规则截断（默认 32）。

## 行为细节
- 默认人类可读：表头 + 1 行数据。
- `--json`：输出原始结构。
- 未订阅（404 或空响应）：默认输出“未订阅”（不渲染表格）。
- 其它命令输出不变。

## 错误处理
- 401/403：提示 `getrouter auth login`（沿用既有策略）。
- 其它错误：沿用现有 JSON 与非 JSON 的错误输出策略。

## 测试策略
- `subscription show` 默认输出包含表头与列顺序。
- `--json` 输出结构不变。
- 未订阅场景输出“未订阅”。
