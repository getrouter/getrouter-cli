import { describe, expect, it, vi } from "vitest";
import {
  copyToClipboard,
  getClipboardCommands,
} from "../../../src/core/interactive/clipboard";

const makeSpawn = () =>
  vi.fn(() => {
    const handlers: Record<string, Array<(code?: number) => void>> = {};
    const child = {
      stdin: { write: vi.fn(), end: vi.fn() },
      on: (event: string, cb: (code?: number) => void) => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(cb);
        return child;
      },
    };
    queueMicrotask(() => {
      handlers.close?.forEach((cb) => {
        cb(0);
      });
    });
    return child;
  });

describe("getClipboardCommands", () => {
  it("returns pbcopy on darwin", () => {
    expect(getClipboardCommands("darwin")[0]?.command).toBe("pbcopy");
  });
});

describe("copyToClipboard", () => {
  it("writes to clipboard with provided spawn", async () => {
    const spawnFn = makeSpawn();
    const ok = await copyToClipboard("hello", {
      platform: "darwin",
      spawnFn,
    });
    expect(ok).toBe(true);
    expect(spawnFn).toHaveBeenCalledWith("pbcopy", [], {
      stdio: ["pipe", "ignore", "ignore"],
    });
  });
});
