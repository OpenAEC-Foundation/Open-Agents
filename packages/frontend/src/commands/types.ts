/** JSON Schema-like parameter definition for a command */
export interface ParamSchema {
  type: "string" | "number" | "boolean" | "object";
  description: string;
  required?: boolean;
  default?: unknown;
}

/** Result of executing a command */
export interface CommandResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** State before a command was executed (for undo) */
export interface UndoState {
  label: string;
  undo: () => void;
}

/** A registered command definition */
export interface CommandDef {
  /** Unique command id, e.g. "canvas.addNode" */
  id: string;

  /** Human-readable label */
  label: string;

  /** Description for docs / MCP */
  description: string;

  /** Parameter schema (for auto-generated UI / MCP tools) */
  params: Record<string, ParamSchema>;

  /** Whether this command supports undo */
  undoable: boolean;

  /** Execute the command; returns result + optional undo state */
  execute: (args: Record<string, unknown>) => CommandResult & { undoState?: UndoState };
}

/** MCP tool definition generated from a command */
export interface McpToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}
