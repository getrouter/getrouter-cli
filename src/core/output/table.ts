type TableOptions = { maxColWidth?: number };

const truncate = (value: string, max: number) => {
  if (value.length <= max) return value;
  if (max <= 3) return value.slice(0, max);
  return `${value.slice(0, max - 3)}...`;
};

export const renderTable = (
  headers: string[],
  rows: string[][],
  options: TableOptions = {},
) => {
  const maxColWidth = options.maxColWidth ?? 32;
  const normalized = rows.map((row) =>
    row.map((cell) => (cell && cell.length > 0 ? cell : "-")),
  );
  const widths = headers.map((header, index) => {
    const colValues = normalized.map((row) => row[index] ?? "-");
    const maxLen = Math.max(header.length, ...colValues.map((v) => v.length));
    return Math.min(maxLen, maxColWidth);
  });
  const renderRow = (cells: string[]) =>
    cells
      .map((cell, index) => {
        const raw = cell ?? "-";
        const clipped = truncate(raw, widths[index]);
        return clipped.padEnd(widths[index], " ");
      })
      .join("  ");
  const headerRow = renderRow(headers);
  const body = normalized.map((row) => renderRow(row)).join("\n");
  return `${headerRow}\n${body}`;
};
