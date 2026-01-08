import type { Command } from "commander";
import { buildAnthropicEnv, registerEnvCommand } from "./env";

export const registerClaudeCommand = (program: Command) => {
  registerEnvCommand(program, {
    name: "claude",
    description: "Configure Claude environment",
    vars: buildAnthropicEnv,
  });
};
