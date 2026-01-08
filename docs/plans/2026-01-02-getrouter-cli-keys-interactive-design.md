# getrouter CLI Keys 交互式选择设计

日期：2026-01-02  
状态：已确认

## 目标
- `keys get/update/delete` 在未传 `id` 时进入交互式选择（上下键选择）。
- 非交互环境未传 `id` 时报错提示缺少 `id`。

## 交互行为
- 触发条件：`keys get/update/delete` 未传 `id`。
- 非交互（stdin 非 TTY）：直接报错“缺少 id”（提示可传 `id`）。
- `keys delete`：选择后二次确认（Y/N）再执行删除。
- `keys get/update`：选择后直接执行。
- `--json` 输出保持不变。

## 列表显示与排序
- 显示字段：`NAME (ID)` + `ENABLED` + `CREATED_AT`。
- 排序：按 `CREATED_AT` 倒序（最新在前）。

## 错误处理
- 无可选 key：提示“没有可用的 API key”。
- 401/403：沿用现有鉴权提示。

## 测试策略
- 未传 `id` 时进入选择流程（mock 选择返回）。
- 非交互且未传 `id` 时抛错。
- `keys delete` 需确认后才调用删除。
