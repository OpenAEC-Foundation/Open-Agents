import { CommandRegistry } from "./registry";
import { canvasCommands } from "./canvas.commands";

/** Singleton command registry */
export const commandRegistry = new CommandRegistry();

// Register all canvas commands
for (const cmd of canvasCommands) {
  commandRegistry.register(cmd);
}

// Re-export types
export type { CommandDef, CommandResult, UndoState, McpToolDef, ParamSchema } from "./types";
export { CommandRegistry } from "./registry";
