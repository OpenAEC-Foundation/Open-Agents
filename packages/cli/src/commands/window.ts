import type { Command } from "commander";
import { client } from "../client";

export function registerWindowCommands(program: Command): void {
  const window = program
    .command("window")
    .description("Window and workspace commands");

  window
    .command("workspace")
    .description("Show workspace state")
    .action(async () => {
      const result = await client.get("/workspace-state");
      console.log(JSON.stringify(result, null, 2));
    });

  window
    .command("state")
    .description("Show window state")
    .action(async () => {
      const result = await client.get("/window-state");
      console.log(JSON.stringify(result, null, 2));
    });

  window
    .command("extensions")
    .description("List installed extensions")
    .action(async () => {
      const result = await client.get("/extensions");
      console.log(JSON.stringify(result, null, 2));
    });

  window
    .command("scm")
    .description("Show source control state")
    .action(async () => {
      const result = await client.get("/scm-state");
      console.log(JSON.stringify(result, null, 2));
    });

  window
    .command("tasks")
    .description("List available tasks")
    .action(async () => {
      const result = await client.get("/tasks");
      console.log(JSON.stringify(result, null, 2));
    });
}
