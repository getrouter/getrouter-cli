import { describe, expect, it } from "vitest";
import { renderUsageChart } from "../../src/core/output/usages";

describe("renderUsageChart", () => {
  it("renders bars with total tokens", () => {
    const output = renderUsageChart([
      {
        day: "2026-01-03",
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        requests: 2,
      },
    ]);
    expect(output).toContain("2026-01-03");
    expect(output).toMatch(/█/);
  });

  it("uses an emoji header and token-friendly numbers", () => {
    const output = renderUsageChart([
      {
        day: "2026-01-03",
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
        requests: 2,
      },
    ]);
    expect(output.startsWith("📊 Usage (last 7 days)")).toBe(true);
    expect(output).toContain("Tokens");
    expect(output).toContain("█");
    expect(output).toContain("2K");
    expect(output).toContain("📊 Usage (last 7 days) · Tokens\n\n2026-01-03");
    expect(output).not.toContain("Legend");
    expect(output).not.toContain("I:");
    expect(output).not.toContain("O:");
  });

  it("prints total tokens only", () => {
    const output = renderUsageChart([
      {
        day: "2026-01-03",
        inputTokens: 1200,
        outputTokens: 3400,
        totalTokens: 4600,
        requests: 2,
      },
    ]);
    expect(output).toContain("4.6K");
    expect(output).not.toContain("I:");
    expect(output).not.toContain("O:");
  });

  it("handles numeric strings without skewing bars", () => {
    const output = renderUsageChart(
      [
        {
          day: "2026-01-03",
          inputTokens: "1000",
          outputTokens: "1000",
          totalTokens: "2000",
          requests: 1,
        } as unknown as Parameters<typeof renderUsageChart>[0][number],
      ],
      10,
    );
    expect(output).toContain("██████████");
    expect(output).toContain("2K");
  });
});
