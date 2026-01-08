import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import type { ModelService } from "../../src/generated/router/dashboard/v1";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", {
    value,
    configurable: true,
  });
};

const mockModel = {
  id: "gpt-5",
  name: "GPT-5",
  author: "OpenAI",
  enabled: true,
  updatedAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  setStdinTTY(originalIsTTY);
});

describe("models command", () => {
  it("lists models with list subcommand", async () => {
    setStdinTTY(false);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modelService: {
        ListModels: vi.fn().mockResolvedValue({ models: [mockModel] }),
      } as unknown as ModelService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "models", "list"]);
    const output = log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("ID");
    expect(output).toContain("NAME");
    expect(output).toContain("gpt-5");
    expect(output).toContain("GPT-5");
    log.mockRestore();
  });

  it("lists models when no subcommand", async () => {
    setStdinTTY(true);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      modelService: {
        ListModels: vi.fn().mockResolvedValue({ models: [mockModel] }),
      } as unknown as ModelService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "models"]);
    const output = log.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("ID");
    expect(output).toContain("NAME");
    expect(output).toContain("gpt-5");
    expect(output).toContain("GPT-5");
    log.mockRestore();
  });
});
