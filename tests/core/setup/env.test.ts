import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  appendRcIfMissing,
  getEnvFilePath,
  getHookFilePath,
  renderEnv,
  renderHook,
  resolveShellRcPath,
  writeEnvFile,
} from "../../../src/core/setup/env";

const vars = {
  openaiBaseUrl: "https://api.getrouter.dev/codex",
  openaiApiKey: "key-123",
  anthropicBaseUrl: "https://api.getrouter.dev/claude",
  anthropicApiKey: "key-123",
};

describe("setup env helpers", () => {
  it("renders sh env", () => {
    const output = renderEnv("sh", vars);
    expect(output).toContain(
      "export OPENAI_BASE_URL='https://api.getrouter.dev/codex'",
    );
    expect(output).toContain("export ANTHROPIC_API_KEY='key-123'");
  });

  it("renders ps1 env", () => {
    const output = renderEnv("ps1", vars);
    expect(output).toContain(
      "$env:OPENAI_BASE_URL='https://api.getrouter.dev/codex'",
    );
    expect(output).toContain("$env:ANTHROPIC_API_KEY='key-123'");
  });

  it("escapes values safely", () => {
    expect(
      renderEnv("sh", {
        openaiApiKey: "a'b",
      }),
    ).toContain("export OPENAI_API_KEY='a'\\''b'");

    expect(
      renderEnv("ps1", {
        openaiApiKey: "a'b",
      }),
    ).toContain("$env:OPENAI_API_KEY='a''b'");
  });

  it("writes env file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-env-"));
    const filePath = getEnvFilePath("sh", dir);
    writeEnvFile(filePath, "hello");
    expect(fs.readFileSync(filePath, "utf8")).toBe("hello");
  });

  it("renders sh hook", () => {
    const output = renderHook("bash");
    expect(output).toContain("getrouter() {");
    expect(output).toContain("command getrouter");
    expect(output).toContain("source");
  });

  it("renders pwsh hook", () => {
    const output = renderHook("pwsh");
    expect(output).toContain("function getrouter");
    expect(output).toContain("$LASTEXITCODE");
  });

  it("resolves shell rc paths", () => {
    expect(resolveShellRcPath("zsh", "/tmp")).toBe("/tmp/.zshrc");
    expect(resolveShellRcPath("bash", "/tmp")).toBe("/tmp/.bashrc");
    expect(resolveShellRcPath("fish", "/tmp")).toBe(
      "/tmp/.config/fish/config.fish",
    );
  });

  it("resolves hook file paths", () => {
    expect(getHookFilePath("bash", "/tmp")).toBe("/tmp/hook.sh");
    expect(getHookFilePath("zsh", "/tmp")).toBe("/tmp/hook.sh");
    expect(getHookFilePath("fish", "/tmp")).toBe("/tmp/hook.fish");
    expect(getHookFilePath("pwsh", "/tmp")).toBe("/tmp/hook.ps1");
  });

  it("appends rc line once", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "getrouter-rc-"));
    const rcPath = path.join(dir, "rc");
    const line = "source ~/.getrouter/env.sh";
    fs.writeFileSync(rcPath, `${line}\n`);
    expect(appendRcIfMissing(rcPath, line)).toBe(false);
    expect(appendRcIfMissing(rcPath, line)).toBe(false);
    const content = fs.readFileSync(rcPath, "utf8");
    expect(content.split(line).length - 1).toBe(1);
  });
});
