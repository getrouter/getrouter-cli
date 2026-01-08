import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import { writeAuth } from "../../src/core/config";
import type {
  AuthService,
  ConsumerService,
  SubscriptionService,
} from "../../src/generated/router/dashboard/v1";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

describe("status command", () => {
  it("prints logged out status with no subscription", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      subscriptionService: {
        CurrentSubscription: vi.fn().mockResolvedValue(null),
      } as SubscriptionService,
      authService: {} as AuthService,
      consumerService: {} as unknown as ConsumerService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "status"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("🔐 Auth");
    expect(output).toContain("  Status    : ❌ Logged out");
    expect(output).toContain("\n\n📦 Subscription");
    expect(output).toContain("  Status    : No active subscription");
    log.mockRestore();
  });

  it("prints logged in status with subscription info", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "token",
      refreshToken: "refresh",
      expiresAt: "2026-02-02T14:39:49Z",
      tokenType: "Bearer",
    });
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      subscriptionService: {
        CurrentSubscription: vi.fn().mockResolvedValue({
          status: "ACTIVE",
          plan: { name: "Pro", requestPerMinute: 20, tokenPerMinute: "150K" },
          startAt: "2026-01-01T00:00:00Z",
          endAt: "2026-02-01T00:00:00Z",
        }),
      } as SubscriptionService,
      authService: {} as AuthService,
      consumerService: {} as unknown as ConsumerService,
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "status"]);
    const output = log.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("🔐 Auth");
    expect(output).toContain("  Status    : ✅ Logged in");
    expect(output).toContain("  Expires   : 2026-02-02T14:39:49Z");
    expect(output).toContain("  TokenType : Bearer");
    expect(output).toContain("  Access    : token");
    expect(output).toContain("  Refresh   : refresh");
    expect(output).toContain("\n\n📦 Subscription");
    expect(output).toContain("  Plan      : Pro");
    expect(output).toContain("  Status    : ACTIVE");
    expect(output).toContain(
      "  Window    : 2026-01-01T00:00:00Z → 2026-02-01T00:00:00Z",
    );
    expect(output).toContain("  Limits    : 20 req/min · 150K tok/min");
    log.mockRestore();
  });
});
