import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { clearAuth } from "../core/auth";
import {
  buildLoginUrl,
  generateAuthCode,
  openLoginUrl,
  pollAuthorize,
} from "../core/auth/device";
import { writeAuth } from "../core/config";

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Login with device flow")
    .action(async () => {
      const { authService } = createApiClients({ includeAuth: false });
      const authCode = generateAuthCode();
      const url = buildLoginUrl(authCode);
      console.log("🔐 To authenticate, visit:");
      console.log(url);
      console.log("⏳ Waiting for confirmation...");
      void openLoginUrl(url);
      const token = await pollAuthorize({
        authorize: authService.Authorize.bind(authService),
        code: authCode,
      });
      writeAuth({
        accessToken: token.accessToken ?? "",
        refreshToken: token.refreshToken ?? "",
        expiresAt: token.expiresAt ?? "",
        tokenType: "Bearer",
      });
      console.log("✅ Login successful.");
    });

  program
    .command("logout")
    .description("Clear local auth state")
    .action(() => {
      clearAuth();
      console.log("Cleared local auth data.");
    });
}
