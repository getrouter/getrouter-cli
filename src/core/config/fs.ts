import fs from "node:fs";
import path from "node:path";

const getCorruptBackupPath = (filePath: string) => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(16).slice(2, 8);
  return path.join(dir, `${base}.corrupt-${stamp}-${rand}${ext}`);
};

export const readJsonFile = <T = unknown>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null;
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    console.warn(`⚠️ Unable to read ${filePath}. Continuing with defaults.`);
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const backupPath = getCorruptBackupPath(filePath);
    try {
      fs.renameSync(filePath, backupPath);
      console.warn(
        `⚠️ Invalid JSON in ${filePath}. Moved to ${backupPath} and continuing with defaults.`,
      );
    } catch {
      console.warn(
        `⚠️ Invalid JSON in ${filePath}. Please fix or delete this file, then try again.`,
      );
    }
    return null;
  }
};

export const writeJsonFile = (filePath: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};
