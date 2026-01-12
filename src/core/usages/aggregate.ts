export type RawUsage = {
  createdAt?: string;
  inputTokens?: number | string;
  outputTokens?: number | string;
  totalTokens?: number | string;
};

export type AggregatedUsage = {
  day: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
};

const formatDay = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toNumber = (value: number | string | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function aggregateUsages(
  usages: RawUsage[],
  maxDays = 7,
): AggregatedUsage[] {
  const totals = new Map<string, AggregatedUsage>();

  for (const usage of usages) {
    if (!usage.createdAt) continue;
    const parsed = new Date(usage.createdAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const day = formatDay(parsed);
    const input = toNumber(usage.inputTokens);
    const output = toNumber(usage.outputTokens);
    const totalRaw =
      typeof usage.totalTokens === "string" ||
      typeof usage.totalTokens === "number"
        ? Number(usage.totalTokens)
        : Number.NaN;
    const total =
      Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : input + output;
    const current = totals.get(day) ?? {
      day,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requests: 0,
    };
    current.inputTokens += input;
    current.outputTokens += output;
    current.totalTokens += total;
    current.requests += 1;
    totals.set(day, current);
  }

  return Array.from(totals.values())
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, maxDays);
}
