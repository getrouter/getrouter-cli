import { spawn } from "node:child_process";

type ClipboardCommand = {
  command: string;
  args: string[];
};

type SpawnLike = (
  command: string,
  args: string[],
  options: { stdio: ["pipe", "ignore", "ignore"] },
) => {
  stdin: { write: (text: string) => void; end: () => void };
  on: (event: string, cb: (code?: number) => void) => void;
};

type CopyOptions = {
  platform?: NodeJS.Platform;
  spawnFn?: SpawnLike;
};

export function getClipboardCommands(
  platform: NodeJS.Platform,
): ClipboardCommand[] {
  if (platform === "darwin") return [{ command: "pbcopy", args: [] }];
  if (platform === "win32") return [{ command: "clip", args: [] }];
  return [
    { command: "wl-copy", args: [] },
    { command: "xclip", args: ["-selection", "clipboard"] },
  ];
}

function runClipboardCommand(
  text: string,
  command: ClipboardCommand,
  spawnFn: SpawnLike,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawnFn(command.command, command.args, {
      stdio: ["pipe", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    child.stdin.write(text);
    child.stdin.end();
  });
}

export async function copyToClipboard(
  text: string,
  options: CopyOptions = {},
): Promise<boolean> {
  if (!text) return false;
  const platform = options.platform ?? process.platform;
  const spawnFn = options.spawnFn ?? spawn;
  const commands = getClipboardCommands(platform);
  for (const command of commands) {
    const ok = await runClipboardCommand(text, command, spawnFn);
    if (ok) return true;
  }
  return false;
}
