import type { Command } from "commander";
import { buildAnthropicEnv, registerEnvCommand } from "./env";

export function registerClaudeCommand(program: Command): void {
  registerEnvCommand(program, {
    name: "claude",
    description: "Configure Claude environment",
    vars: buildAnthropicEnv,
  });
}
