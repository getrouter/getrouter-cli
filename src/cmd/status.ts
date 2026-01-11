import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { getAuthStatus } from "../core/auth";

const LABEL_WIDTH = 10;

type LineValue = string | number | undefined;

type SectionLine = readonly [label: string, value: LineValue];
type SectionItem = SectionLine | false | null | undefined;

const line = (label: string, value: LineValue): SectionLine => [label, value];

const formatLine = (label: string, value: LineValue) => {
  if (value == null || value === "") return null;
  return `  ${label.padEnd(LABEL_WIDTH, " ")}: ${value}`;
};

const renderSection = (title: string, items: SectionItem[]) => {
  const lines: string[] = [];
  for (const item of items) {
    if (!item) continue;
    const rendered = formatLine(item[0], item[1]);
    if (rendered) lines.push(rendered);
  }
  return [title, ...lines].join("\n");
};

const formatAuthStatus = (status: "logged_in" | "logged_out") =>
  status === "logged_in" ? "✅ Logged in" : "❌ Logged out";

const formatToken = (token?: string) => {
  if (!token) return undefined;
  const trimmed = token.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
};

const formatWindow = (startAt?: string, endAt?: string) => {
  if (!startAt && !endAt) return undefined;
  if (startAt && endAt) return `${startAt} → ${endAt}`;
  if (startAt) return `${startAt} →`;
  return `→ ${endAt}`;
};

const formatLimits = (
  requestPerMinute?: number,
  tokenPerMinute?: string | number,
) => {
  const parts: string[] = [];
  if (typeof requestPerMinute === "number") {
    parts.push(`${requestPerMinute} req/min`);
  }
  if (tokenPerMinute) {
    parts.push(`${tokenPerMinute} tok/min`);
  }
  if (parts.length === 0) return undefined;
  return parts.join(" · ");
};

const renderAuthSection = () => {
  const status = getAuthStatus();
  const logged = status.status === "logged_in";

  return renderSection("🔐 Auth", [
    line("Status", formatAuthStatus(status.status)),
    logged && line("Expires", status.expiresAt),
    logged && line("TokenType", status.tokenType),
    logged && line("Access", formatToken(status.accessToken)),
    logged && line("Refresh", formatToken(status.refreshToken)),
  ]);
};

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

const renderSubscriptionSection = (subscription: Subscription | null) => {
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
};

export const registerStatusCommand = (program: Command) => {
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
};
