# getrouter CLI Keys 列表输出设计（表格）

日期：2026-01-02  
状态：已确认

## 目标
- `keys list` 默认输出改为表格，提升可读性。
- 保留 `--json` 作为脚本接口；`apiKey` 默认脱敏。

## 表格列与顺序
- 列顺序固定：`ID | NAME | ENABLED | LAST_ACCESS | CREATED_AT | API_KEY`
- 空值显示 `-`，避免列塌陷。
- `apiKey` 默认脱敏（前 4 后 4），`--show-secret` 明文。

## 表格渲染组件
新增轻量表格工具（建议 `src/core/output/table.ts`）：
- 输入：`headers: string[]`、`rows: Array<Array<string>>`
- 列宽 = `max(表头宽度, 各行最大宽度)`，再受 `MAX_COL_WIDTH` 约束（如 32）。
- 超宽截断：保留前 `MAX-3` 字符并追加 `...`。
- 左对齐，列间空两格。
- 不做脱敏，仅渲染字符串。

## 命令层行为
- `keys list` 在非 `--json` 情况使用表格输出。
- `--json` 输出完整结构（已脱敏）。
- 其他 keys 子命令暂保持 key=value 输出（可后续统一为表格）。

## 测试策略
- 表格渲染单测：宽度计算、截断、空值、对齐。
- `keys list` 输出单测：确保表头与列顺序；校验脱敏结果。

