# getrouter CLI Keys get 表格输出设计

日期：2026-01-02  
状态：已确认

## 目标
- `keys get <id>` 默认输出改为单行表格，与 `keys list` 同列顺序。
- `--json` 行为不变；`apiKey` 默认脱敏。

## 输出格式
- 列顺序：`ID | NAME | ENABLED | LAST_ACCESS | CREATED_AT | API_KEY`
- 单行表格：表头 + 1 行数据。
- 空值显示 `-`；超长字段按 `renderTable` 规则截断。

## 行为细节
- 默认人类可读：表格输出。
- `--json`：输出完整对象（脱敏或明文由 `--show-secret` 决定）。
- 其它命令输出暂不改变（create/update 保持 key=value）。

## 测试策略
- `keys get` 默认输出包含表头与列顺序。
- `apiKey` 仍为脱敏值（前 4 后 4）。

