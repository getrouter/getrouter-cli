import type { Command } from "commander";
import { registerAuthCommands } from "./auth";
import { registerClaudeCommand } from "./claude";
import { registerCodexCommand } from "./codex";
import { registerKeysCommands } from "./keys";
import { registerModelsCommands } from "./models";
import { registerStatusCommand } from "./status";
import { registerUsagesCommand } from "./usages";

export const registerCommands = (program: Command) => {
  registerAuthCommands(program);
  registerCodexCommand(program);
  registerClaudeCommand(program);
  registerKeysCommands(program);
  registerModelsCommands(program);
  registerStatusCommand(program);
  registerUsagesCommand(program);
};
