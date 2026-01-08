import type { AggregatedUsage } from "../usages/aggregate";

const TOTAL_BLOCK = "█";
const DEFAULT_WIDTH = 24;

const formatTokens = (value: number) => {
  const abs = Math.abs(value);
  if (abs < 1000) return Math.round(value).toString();
  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];
  for (const unit of units) {
    if (abs >= unit.threshold) {
      const scaled = value / unit.threshold;
      const decimals = Math.abs(scaled) < 10 ? 1 : 0;
      let output = scaled.toFixed(decimals);
      if (output.endsWith(".0")) {
        output = output.slice(0, -2);
      }
      return `${output}${unit.suffix}`;
    }
  }
  return Math.round(value).toString();
};

export const renderUsageChart = (
  rows: AggregatedUsage[],
  width = DEFAULT_WIDTH,
) => {
  const header = "📊 Usage (last 7 days) · Tokens";
  if (rows.length === 0) {
    return `${header}\n\nNo usage data available.`;
  }
  const normalized = rows.map((row) => {
    const total = Number(row.totalTokens);
    const safeTotal = Number.isFinite(total) ? total : 0;
    return {
      day: row.day,
      total: safeTotal,
    };
  });
  const totals = normalized.map((row) => row.total);
  const maxTotal = Math.max(0, ...totals);
  const lines = normalized.map((row) => {
    if (maxTotal === 0 || row.total === 0) {
      return `${row.day} ${"".padEnd(width, " ")} 0`;
    }
    const scaled = Math.max(1, Math.round((row.total / maxTotal) * width));
    const bar = TOTAL_BLOCK.repeat(scaled);
    const totalLabel = formatTokens(row.total);
    return `${row.day} ${bar.padEnd(width, " ")} ${totalLabel}`;
  });
  return [header, "", ...lines].join("\n");
};
