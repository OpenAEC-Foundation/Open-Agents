import type { Command } from "commander";
import { client } from "../client";

export function registerTerminalCommands(program: Command): void {
  const terminal = program
    .command("terminal")
    .description("Terminal control commands");

  terminal
    .command("list")
    .description("List all terminals")
    .action(async () => {
      const result = await client.get("/terminals");
      console.log(JSON.stringify(result, null, 2));
    });

  terminal
    .command("create")
    .description("Create a new terminal")
    .option("-n, --name <name>", "Terminal name")
    .option("--cwd <dir>", "Working directory")
    .action(async (opts: { name?: string; cwd?: string }) => {
      const result = await client.post("/create-terminal", {
        name: opts.name,
        cwd: opts.cwd,
      });
      console.log(JSON.stringify(result, null, 2));
    });

  terminal
    .command("send <text>")
    .description("Send text to active terminal")
    .option("--id <pid>", "Terminal PID", parseInt)
    .option("--no-newline", "Don't add newline")
    .action(async (text: string, opts: { id?: number; newline?: boolean }) => {
      await client.post("/send-text", {
        text,
        terminalId: opts.id,
        addNewLine: opts.newline !== false,
      });
      console.log("Sent.");
    });

  terminal
    .command("kill")
    .description("Kill active terminal")
    .option("--id <pid>", "Terminal PID", parseInt)
    .action(async (opts: { id?: number }) => {
      await client.post("/kill-terminal", { terminalId: opts.id });
      console.log("Killed.");
    });
}
