import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { getAuthStatus } from "../core/auth";

const LABEL_WIDTH = 10;

type LineValue = string | number | undefined;

type SectionLine = readonly [label: string, value: LineValue];
type SectionItem = SectionLine | false | null | undefined;

type AuthStatus = "logged_in" | "logged_out";

type Subscription = {
  plan?: {
    name?: string;
    requestPerMinute?: number;
    tokenPerMinute?: string | number;
  };
  status?: string;
  startAt?: string;
  endAt?: string;
};

function line(label: string, value: LineValue): SectionLine {
  return [label, value];
}

function formatLine(label: string, value: LineValue): string | null {
  if (value == null || value === "") {
    return null;
  }

  return `  ${label.padEnd(LABEL_WIDTH, " ")}: ${value}`;
}

function renderSection(title: string, items: SectionItem[]): string {
  const lines: string[] = [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    const rendered = formatLine(item[0], item[1]);
    if (rendered) {
      lines.push(rendered);
    }
  }

  return [title, ...lines].join("\n");
}

function formatAuthStatus(status: AuthStatus): string {
  if (status === "logged_in") {
    return "✅ Logged in";
  }

  return "❌ Logged out";
}

function formatToken(token?: string): string | undefined {
  if (!token) {
    return undefined;
  }

  const trimmed = token.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

function formatWindow(startAt?: string, endAt?: string): string | undefined {
  if (!startAt && !endAt) {
    return undefined;
  }

  if (startAt && endAt) {
    return `${startAt} → ${endAt}`;
  }

  if (startAt) {
    return `${startAt} →`;
  }

  return `→ ${endAt}`;
}

function formatLimits(
  requestPerMinute?: number,
  tokenPerMinute?: string | number,
): string | undefined {
  const parts: string[] = [];

  if (typeof requestPerMinute === "number") {
    parts.push(`${requestPerMinute} req/min`);
  }

  if (tokenPerMinute) {
    parts.push(`${tokenPerMinute} tok/min`);
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join(" · ");
}

function renderAuthSection(): string {
  const status = getAuthStatus();
  const isLoggedIn = status.status === "logged_in";

  return renderSection("🔐 Auth", [
    line("Status", formatAuthStatus(status.status)),
    isLoggedIn && line("Expires", status.expiresAt),
    isLoggedIn && line("TokenType", status.tokenType),
    isLoggedIn && line("Access", formatToken(status.accessToken)),
    isLoggedIn && line("Refresh", formatToken(status.refreshToken)),
  ]);
}

function renderSubscriptionSection(subscription: Subscription | null): string {
  if (!subscription) {
    return renderSection("📦 Subscription", [
      line("Status", "No active subscription"),
    ]);
  }

  const limits = formatLimits(
    subscription.plan?.requestPerMinute,
    subscription.plan?.tokenPerMinute,
  );

  return renderSection("📦 Subscription", [
    line("Plan", subscription.plan?.name),
    line("Status", subscription.status),
    line("Window", formatWindow(subscription.startAt, subscription.endAt)),
    line("Limits", limits),
  ]);
}

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show login and subscription status")
    .action(async () => {
      const { subscriptionService } = createApiClients({});
      const subscription = await subscriptionService.CurrentSubscription({});

      console.log(renderAuthSection());
      console.log("");
      console.log(renderSubscriptionSection(subscription));
    });
}
