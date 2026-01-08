# getrouter CLI Keys delete 表格输出设计

日期：2026-01-02  
状态：已确认

## 目标
- `keys delete` 默认输出改为表格，与其它 `keys` 命令风格一致。
- `--json` 行为不变。

## 输出格式
- 列顺序：`ID | NAME | ENABLED | LAST_ACCESS | CREATED_AT | API_KEY`
- 单行表格：表头 + 1 行数据。
- 仅填充 `ID`，其余字段为空（表格显示为 `-`）。

## 行为细节
- 默认人类可读：表格输出。
- `--json`：输出 `{ deleted: true, id }`。
- 不再输出 `deleted=true` / `id=...` 的 key=value 形式。

## 测试策略
- `keys delete` 默认输出包含表头并包含 `ID` 值。
- `--json` 输出结构不变。
