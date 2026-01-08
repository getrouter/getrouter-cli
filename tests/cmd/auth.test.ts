import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../../src/cli";
import { createApiClients } from "../../src/core/api/client";
import {
  buildLoginUrl,
  generateAuthCode,
  openLoginUrl,
  pollAuthorize,
} from "../../src/core/auth/device";
import { writeAuth } from "../../src/core/config";
import type {
  AuthService,
  ConsumerService,
  SubscriptionService,
} from "../../src/generated/router/dashboard/v1";

vi.mock("../../src/core/api/client", () => ({
  createApiClients: vi.fn(),
}));

vi.mock("../../src/core/auth/device", async () => {
  const actual = await vi.importActual<
    typeof import("../../src/core/auth/device")
  >("../../src/core/auth/device");
  return {
    ...actual,
    generateAuthCode: vi.fn(() => "abcde234567fg"),
    openLoginUrl: vi.fn(async () => {}),
    pollAuthorize: vi.fn(),
  };
});

const makeDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-"));

describe("auth commands", () => {
  it("login polls authorize and writes auth.json", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    const authService = {
      Authorize: vi.fn(),
      CreateAuth: vi.fn(),
      RefreshToken: vi.fn(),
    } as AuthService;
    (createApiClients as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      authService,
      consumerService: {} as unknown as ConsumerService,
      subscriptionService: {} as SubscriptionService,
    });
    (pollAuthorize as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: "2026-01-03T00:00:00Z",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "login"]);
    const saved = JSON.parse(
      fs.readFileSync(path.join(dir, "auth.json"), "utf-8"),
    );
    expect(saved.accessToken).toBe("access");
    expect(saved.refreshToken).toBe("refresh");
    expect(saved.tokenType).toBe("Bearer");
    expect(openLoginUrl).toHaveBeenCalledWith(
      buildLoginUrl(
        (generateAuthCode as unknown as ReturnType<typeof vi.fn>).mock
          .results[0].value,
      ),
    );
    log.mockRestore();
  });

  it("logout clears local auth", async () => {
    const dir = makeDir();
    process.env.GETROUTER_CONFIG_DIR = dir;
    writeAuth({
      accessToken: "a",
      refreshToken: "b",
      expiresAt: "c",
      tokenType: "Bearer",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const program = createProgram();
    await program.parseAsync(["node", "getrouter", "logout"]);
    expect(log.mock.calls[0][0]).toContain("Cleared local auth data");
    log.mockRestore();
  });
});
