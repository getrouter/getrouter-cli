import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

describe("usages command", () => {
  it("prints chart with total tokens only", async () => {
    const listUsage = vi.fn().mockResolvedValue({
      usages: [
        {
          createdAt: "2026-01-03T00:00:00Z",
          inputTokens: 1000,
          outputTokens: 1000,
          totalTokens: 2000,
        },
      ],
    });
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usageService: { ListUsage: listUsage },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "usages"]);
    expect(listUsage).toHaveBeenCalledTimes(1);
    expect(listUsage).toHaveBeenCalledWith({
      pageSize: 7,
      pageToken: undefined,
    });
    expect(log).toHaveBeenCalledTimes(1);
    const output = String(log.mock.calls[0][0] ?? "");
    expect(output).toContain("📊 Usage (last 7 days)");
    expect(output).toContain("2K");
    expect(output).not.toContain("I:");
    expect(output).not.toContain("O:");
    expect(output).not.toContain("Legend");
    expect(output).not.toContain("DAY");
    log.mockRestore();
  });
});
