import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";

type AuthToken = {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  expiresAt: string | undefined;
};

type AuthorizeFn = (req: { code: string }) => Promise<AuthToken>;

type PollOptions = {
  authorize: AuthorizeFn;
  code: string;
  timeoutMs?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onRetry?: (attempt: number, delayMs: number) => void;
};

const alphabet = "abcdefghijklmnopqrstuvwxyz234567";

export const generateAuthCode = () => {
  let out = "";
  for (let i = 0; i < 13; i += 1) {
    out += alphabet[randomInt(32)];
  }
  return out;
};

export const buildLoginUrl = (authCode: string) =>
  `https://getrouter.dev/auth/${authCode}`;

export const openLoginUrl = async (url: string) => {
  try {
    if (process.platform === "darwin") {
      const child = spawn("open", [url], {
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      return;
    }
    if (process.platform === "win32") {
      const child = spawn("cmd", ["/c", "start", "", url], {
        stdio: "ignore",
        detached: true,
      });
      child.unref();
      return;
    }
    const child = spawn("xdg-open", [url], {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } catch {
    // best effort
  }
};

export const pollAuthorize = async ({
  authorize,
  code,
  timeoutMs = 5 * 60 * 1000,
  initialDelayMs = 1000,
  maxDelayMs = 10000,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  now = () => Date.now(),
  onRetry,
}: PollOptions) => {
  const start = now();
  let delay = initialDelayMs;
  let attempt = 0;
  while (true) {
    try {
      return await authorize({ code });
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      if (status === 404) {
        // keep polling
      } else if (status === 400) {
        throw new Error("Auth code already used. Please log in again.");
      } else if (status === 403) {
        throw new Error("Auth code expired. Please log in again.");
      } else {
        throw err;
      }
    }
    if (now() - start >= timeoutMs) {
      throw new Error(
        "Login timed out. Please run getrouter auth login again.",
      );
    }
    attempt += 1;
    onRetry?.(attempt, delay);
    await sleep(delay);
    delay = Math.min(delay * 2, maxDelayMs);
  }
};
