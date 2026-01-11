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

const getErrorCode = (err: unknown) => {
  if (typeof err !== "object" || err === null) return undefined;
  if (!("code" in err)) return undefined;
  return (err as { code?: unknown }).code;
};

const spawnBrowser = (command: string, args: string[]) => {
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
    });
    child.on("error", (err) => {
      const code = getErrorCode(err);
      let reason = "";
      if (code === "ENOENT") {
        reason = ` (${command} not found)`;
      } else if (typeof code === "string") {
        reason = ` (${code})`;
      }
      console.log(
        `⚠️ Unable to open browser${reason}. Please open the URL manually.`,
      );
    });
    child.unref();
  } catch {
    console.log("⚠️ Unable to open browser. Please open the URL manually.");
  }
};

export const openLoginUrl = async (url: string) => {
  try {
    const platformCommands: Record<
      string,
      { command: string; args: string[] }
    > = {
      darwin: { command: "open", args: [url] },
      win32: { command: "cmd", args: ["/c", "start", "", url] },
    };

    const entry = platformCommands[process.platform] ?? {
      command: "xdg-open",
      args: [url],
    };

    spawnBrowser(entry.command, entry.args);
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

  const getErrorStatus = (err: unknown) => {
    if (typeof err !== "object" || err === null) return undefined;
    if (!("status" in err)) return undefined;
    const status = (err as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  };

  while (true) {
    try {
      return await authorize({ code });
    } catch (err: unknown) {
      const status = getErrorStatus(err);
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
