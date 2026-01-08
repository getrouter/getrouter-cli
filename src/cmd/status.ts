import type { Command } from "commander";
import { createApiClients } from "../core/api/client";
import { getAuthStatus } from "../core/auth";

const LABEL_WIDTH = 10;

const formatLine = (label: string, value: string | number | undefined) => {
  if (value == null || value === "") return null;
  return `  ${label.padEnd(LABEL_WIDTH, " ")}: ${value}`;
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
  const lines = [
    formatLine("Status", formatAuthStatus(status.status)),
    status.status === "logged_in"
      ? formatLine("Expires", status.expiresAt)
      : null,
    status.status === "logged_in"
      ? formatLine("TokenType", status.tokenType)
      : null,
    status.status === "logged_in"
      ? formatLine("Access", formatToken(status.accessToken))
      : null,
    status.status === "logged_in"
      ? formatLine("Refresh", formatToken(status.refreshToken))
      : null,
  ].filter(Boolean) as string[];
  return ["🔐 Auth", ...lines].join("\n");
};

const renderSubscriptionSection = (
  subscription: {
    plan?: {
      name?: string;
      requestPerMinute?: number;
      tokenPerMinute?: string | number;
    };
    status?: string;
    startAt?: string;
    endAt?: string;
  } | null,
) => {
  if (!subscription) {
    return ["📦 Subscription", formatLine("Status", "No active subscription")]
      .filter(Boolean)
      .join("\n");
  }
  const limits = formatLimits(
    subscription.plan?.requestPerMinute,
    subscription.plan?.tokenPerMinute,
  );
  const windowLabel = formatWindow(subscription.startAt, subscription.endAt);
  const lines = [
    formatLine("Plan", subscription.plan?.name),
    formatLine("Status", subscription.status),
    formatLine("Window", windowLabel),
    formatLine("Limits", limits),
  ].filter(Boolean) as string[];
  return ["📦 Subscription", ...lines].join("\n");
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
