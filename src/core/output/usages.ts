import type { AggregatedUsage } from "../usages/aggregate";

const TOTAL_BLOCK = "█";
const DEFAULT_WIDTH = 24;

function formatTokens(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return Math.round(value).toString();

  let threshold = 1_000;
  let suffix = "K";

  if (abs >= 1_000_000_000) {
    threshold = 1_000_000_000;
    suffix = "B";
  } else if (abs >= 1_000_000) {
    threshold = 1_000_000;
    suffix = "M";
  }

  const scaled = value / threshold;
  const decimals = Math.abs(scaled) < 10 ? 1 : 0;
  const output = scaled.toFixed(decimals).replace(/\.0$/, "");
  return `${output}${suffix}`;
}

export function renderUsageChart(
  rows: AggregatedUsage[],
  width = DEFAULT_WIDTH,
): string {
  const header = "📊 Usage (last 7 days) · Tokens";
  if (rows.length === 0) {
    return `${header}\n\nNo usage data available.`;
  }

  const data = rows.map((row) => {
    const rawTotal = Number(row.totalTokens);
    return {
      day: row.day,
      total: Number.isFinite(rawTotal) ? rawTotal : 0,
    };
  });

  const maxTotal = Math.max(0, ...data.map((d) => d.total));

  const lines = data.map(({ day, total }) => {
    if (maxTotal === 0 || total === 0) {
      return `${day} ${" ".repeat(width)} 0`;
    }

    const scaled = Math.max(1, Math.round((total / maxTotal) * width));
    const bar = TOTAL_BLOCK.repeat(scaled);
    return `${day} ${bar.padEnd(width, " ")} ${formatTokens(total)}`;
  });

  return [header, "", ...lines].join("\n");
}
