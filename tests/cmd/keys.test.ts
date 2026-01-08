import prompts from "prompts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import type {
  AuthService,
  ConsumerService,
  SubscriptionService,
} from "../../src/generated/router/dashboard/v1";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

const mockConsumer = {
  id: "c1",
  name: "dev",
  enabled: true,
  apiKey: "abcd1234WXYZ",
  lastAccess: "2026-01-02T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
};

const emptyAuthService = {} as AuthService;
const emptySubscriptionService = {} as SubscriptionService;

const originalIsTTY = process.stdin.isTTY;
const setStdinTTY = (value: boolean) => {
  Object.defineProperty(process.stdin, "isTTY", {
    value,
    configurable: true,
  });
};

afterEach(() => {
  setStdinTTY(originalIsTTY);
  prompts.inject([]);
});

describe("keys command", () => {
  it("lists keys with redacted apiKey by default", async () => {
    setStdinTTY(false);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "list"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("API_KEY");
    expect(output).toContain("NAME");
    expect(output).not.toContain("ID");
    expect(output).toContain("abcd...WXYZ");
    expect(output).not.toContain("abcd1234WXYZ");
    log.mockRestore();
  });

  it("lists keys with full apiKey when --show is provided", async () => {
    setStdinTTY(false);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "list", "--show"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("abcd1234WXYZ");
    log.mockRestore();
  });

  it("lists keys when no subcommand", async () => {
    setStdinTTY(true);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("NAME");
    expect(output).not.toContain("ID");
    expect(output).toContain("abcd...WXYZ");
    expect(output).not.toContain("abcd1234WXYZ");
    log.mockRestore();
  });

  it("lists keys when no subcommand and --show is provided", async () => {
    setStdinTTY(true);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        ListConsumers: vi.fn().mockResolvedValue({ consumers: [mockConsumer] }),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "--show"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("abcd1234WXYZ");
    log.mockRestore();
  });

  it("rejects removed get subcommand", async () => {
    setStdinTTY(false);
    const program = createProgram();
    program.exitOverride();
    const silentOutput = {
      writeErr: () => {},
      writeOut: () => {},
      outputError: () => {},
    };
    program.configureOutput(silentOutput);
    program.commands
      .find((command) => command.name() === "keys")
      ?.configureOutput(silentOutput);
    await expect(
      program.parseAsync(["node", "getrouter", "keys", "get", "c1"]),
    ).rejects.toBeTruthy();
  });

  it("creates a key and prints reminder", async () => {
    setStdinTTY(true);
    prompts.inject(["dev", true]);
    const createConsumer = vi.fn().mockResolvedValue(mockConsumer);
    const updateConsumer = vi.fn().mockResolvedValue(mockConsumer);
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        CreateConsumer: createConsumer,
        UpdateConsumer: updateConsumer,
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "create"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("NAME");
    expect(output).toContain("API_KEY");
    expect(output).toContain("Please store this API key securely.");
    log.mockRestore();
  });

  it("updates a key from prompts", async () => {
    setStdinTTY(true);
    prompts.inject(["new-name", false]);
    const updateConsumer = vi.fn().mockResolvedValue({
      ...mockConsumer,
      name: "new-name",
      enabled: false,
    });
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        UpdateConsumer: updateConsumer,
        GetConsumer: vi.fn().mockResolvedValue(mockConsumer),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "update", "c1"]);
    expect(updateConsumer).toHaveBeenCalledWith(
      expect.objectContaining({
        consumer: expect.objectContaining({
          id: "c1",
          name: "new-name",
          enabled: false,
        }),
      }),
    );
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("NAME");
    log.mockRestore();
  });

  it("does not delete when confirmation is declined", async () => {
    setStdinTTY(true);
    prompts.inject([false]);
    const deleteConsumer = vi.fn().mockResolvedValue({});
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      consumerService: {
        DeleteConsumer: deleteConsumer,
        GetConsumer: vi.fn().mockResolvedValue(mockConsumer),
      } as unknown as ConsumerService,
      subscriptionService: emptySubscriptionService,
      authService: emptyAuthService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "keys", "delete", "c1"]);
    expect(deleteConsumer).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
