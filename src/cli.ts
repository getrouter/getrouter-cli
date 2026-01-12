import { Command } from "commander";
import { version } from "../package.json";
import { registerCommands } from "./cmd";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("getrouter")
    .description("CLI for getrouter.dev")
    .version(version);

  registerCommands(program);

  return program;
}
