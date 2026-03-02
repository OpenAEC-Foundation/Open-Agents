import type { Command } from "commander";
import { client } from "../client";

export function registerFileCommands(program: Command): void {
  const files = program.command("files").description("File operation commands");

  files
    .command("read <path>")
    .description("Read file contents")
    .action(async (path: string) => {
      const result = await client.post<{ content: string }>("/read-file", {
        path,
      });
      console.log(result.content);
    });

  files
    .command("write <path>")
    .description("Write stdin to file")
    .option("--content <text>", "Content to write (or pipe via stdin)")
    .action(async (path: string, opts: { content?: string }) => {
      const content = opts.content ?? "";
      await client.post("/write-file", { path, content, createDirectories: true });
      console.log(`Written: ${path}`);
    });

  files
    .command("list <path>")
    .description("List directory contents")
    .option("-r, --recursive", "List recursively")
    .action(async (path: string, opts: { recursive?: boolean }) => {
      const result = await client.post("/list-directory", {
        path,
        recursive: opts.recursive,
      });
      console.log(JSON.stringify(result, null, 2));
    });

  files
    .command("exists <path>")
    .description("Check if file exists")
    .action(async (path: string) => {
      const result = await client.post("/file-exists", { path });
      console.log(JSON.stringify(result, null, 2));
    });
}
