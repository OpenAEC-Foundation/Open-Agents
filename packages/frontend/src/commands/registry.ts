import type { CommandDef, CommandResult, UndoState, McpToolDef } from "./types";

const MAX_UNDO = 50;

export class CommandRegistry {
  private commands = new Map<string, CommandDef>();
  private undoStack: UndoState[] = [];
  private redoStack: UndoState[] = [];

  /** Register a command */
  register(def: CommandDef): void {
    if (this.commands.has(def.id)) {
      console.warn(`Command "${def.id}" already registered, overwriting.`);
    }
    this.commands.set(def.id, def);
  }

  /** Execute a command by id */
  execute(id: string, args: Record<string, unknown> = {}): CommandResult {
    const def = this.commands.get(id);
    if (!def) {
      return { ok: false, error: `Unknown command: ${id}` };
    }

    const result = def.execute(args);

    if (result.ok && result.undoState) {
      this.undoStack.push(result.undoState);
      if (this.undoStack.length > MAX_UNDO) {
        this.undoStack.shift();
      }
      // Clear redo stack on new action
      this.redoStack = [];
    }

    return result;
  }

  /** Undo the last command */
  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    entry.undo();
    this.redoStack.push(entry);
    return true;
  }

  /** Redo the last undone command */
  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    // Re-execute by calling undo's inverse (stored in the entry)
    // Note: for simplicity we store the redo as the undo of the undo
    entry.undo();
    this.undoStack.push(entry);
    return true;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** List all registered commands */
  listCommands(): CommandDef[] {
    return Array.from(this.commands.values());
  }

  /** Get a single command definition */
  getCommand(id: string): CommandDef | undefined {
    return this.commands.get(id);
  }

  /** Auto-generate MCP tool definitions from registered commands */
  getMcpTools(): McpToolDef[] {
    return Array.from(this.commands.values()).map((def) => ({
      name: def.id,
      description: def.description,
      input_schema: {
        type: "object" as const,
        properties: Object.fromEntries(
          Object.entries(def.params).map(([key, schema]) => [
            key,
            { type: schema.type, description: schema.description },
          ]),
        ),
        required: Object.entries(def.params)
          .filter(([, schema]) => schema.required)
          .map(([key]) => key),
      },
    }));
  }
}
