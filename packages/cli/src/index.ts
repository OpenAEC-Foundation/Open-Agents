import { Command } from "commander";
import { registerStatusCommands } from "./commands/status";
import { registerEditorCommands } from "./commands/editor";
import { registerFileCommands } from "./commands/files";
import { registerTerminalCommands } from "./commands/terminal";
import { registerWindowCommands } from "./commands/window";
import { registerInitCommand } from "./commands/init";

const program = new Command();

program
  .name("oa-bridge")
  .description("Control VS Code externally via the Open-Agents bridge")
  .version("0.1.0")
  .option("--url <url>", "Bridge URL (default: http://localhost:7483)");

registerStatusCommands(program);
registerEditorCommands(program);
registerFileCommands(program);
registerTerminalCommands(program);
registerWindowCommands(program);
registerInitCommand(program);

program.parse();
