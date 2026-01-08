import { describe, expect, it } from "vitest";
import { aggregateUsages } from "../../../src/core/usages/aggregate";

describe("aggregateUsages", () => {
  it("groups by local day and totals tokens", () => {
    const rows = [
      {
        createdAt: "2026-01-03T10:00:00",
        inputTokens: 5,
        outputTokens: 7,
        totalTokens: 12,
      },
      {
        createdAt: "2026-01-03T18:00:00",
        inputTokens: 3,
        outputTokens: 2,
        totalTokens: 5,
      },
    ];
    const result = aggregateUsages(rows, 7);
    expect(result).toHaveLength(1);
    expect(result[0].totalTokens).toBe(17);
    expect(result[0].inputTokens).toBe(8);
    expect(result[0].outputTokens).toBe(9);
    expect(result[0].requests).toBe(2);
  });

  it("limits results to the most recent days", () => {
    const rows = [
      { createdAt: "2026-01-05T00:00:00Z", totalTokens: 1 },
      { createdAt: "2026-01-04T00:00:00Z", totalTokens: 1 },
      { createdAt: "2026-01-03T00:00:00Z", totalTokens: 1 },
    ];
    const result = aggregateUsages(rows, 2);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe("2026-01-05");
    expect(result[1].day).toBe("2026-01-04");
  });

  it("coerces string token values to numbers", () => {
    const rows = [
      {
        createdAt: "2026-01-03T10:00:00Z",
        inputTokens: "0123",
        outputTokens: "045",
        totalTokens: "0168",
      },
    ];
    const result = aggregateUsages(rows, 7);
    expect(result).toHaveLength(1);
    expect(result[0].inputTokens).toBe(123);
    expect(result[0].outputTokens).toBe(45);
    expect(result[0].totalTokens).toBe(168);
  });
});
