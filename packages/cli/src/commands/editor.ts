import type { Command } from "commander";
import { client } from "../client";

export function registerEditorCommands(program: Command): void {
  const editor = program
    .command("editor")
    .description("Editor control commands");

  editor
    .command("active")
    .description("Show active editor info")
    .action(async () => {
      const result = await client.get("/active-editor");
      console.log(JSON.stringify(result, null, 2));
    });

  editor
    .command("open <path>")
    .description("Open a file in VS Code")
    .option("-l, --line <n>", "Line number (1-based)", parseInt)
    .option("-c, --character <n>", "Character position", parseInt)
    .option("-p, --preview", "Open as preview tab")
    .action(async (path: string, opts: { line?: number; character?: number; preview?: boolean }) => {
      await client.post("/open-file", {
        path,
        line: opts.line,
        character: opts.character,
        preview: opts.preview,
      });
      console.log(`Opened: ${path}`);
    });

  editor
    .command("files")
    .description("List all open files")
    .action(async () => {
      const result = await client.get("/open-files");
      console.log(JSON.stringify(result, null, 2));
    });

  editor
    .command("get-text [path]")
    .description("Get text from active editor or file")
    .option("--start <n>", "Start line", parseInt)
    .option("--end <n>", "End line", parseInt)
    .action(async (path: string | undefined, opts: { start?: number; end?: number }) => {
      const result = await client.post<{ text: string }>("/get-text", {
        path,
        startLine: opts.start,
        endLine: opts.end,
      });
      console.log(result.text);
    });

  editor
    .command("run-command <command>")
    .description("Execute a VS Code command by ID")
    .option("--args <json>", "Command arguments as JSON array")
    .action(async (command: string, opts: { args?: string }) => {
      const args = opts.args ? JSON.parse(opts.args) : undefined;
      const result = await client.post("/execute-command", { command, args });
      console.log(JSON.stringify(result, null, 2));
    });
}
