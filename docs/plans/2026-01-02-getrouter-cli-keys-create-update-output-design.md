# getrouter CLI Keys create/update 表格输出设计

日期：2026-01-02  
状态：已确认

## 目标
- `keys create` 与 `keys update` 默认输出改为单行表格，与 `keys list/get` 风格一致。
- `--json` 行为不变；`--show-secret` 仍控制 `apiKey` 明文/脱敏。

## 输出格式
- 列顺序：`ID | NAME | ENABLED | LAST_ACCESS | CREATED_AT | API_KEY`
- 单行表格：表头 + 1 行数据。
- 空值显示 `-`；超长字段按 `renderTable` 规则截断。

## 行为细节
- 默认人类可读：表格输出。
- `keys create` 表格输出后继续提示“请妥善保存 API Key。”。
- `keys update` 不输出提示。
- `--json`：输出完整对象（脱敏或明文由 `--show-secret` 决定）。

## 测试策略
- `keys create` 默认输出包含表头、列顺序与提示行。
- `keys update` 默认输出包含表头与列顺序。
- `--json` 输出结构不变。
