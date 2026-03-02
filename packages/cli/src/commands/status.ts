import type { Command } from "commander";
import { client } from "../client";
import type { BridgeHealthResponse as HealthResponse } from "@open-agents/shared";

export function registerStatusCommands(program: Command): void {
  program
    .command("status")
    .description("Check if the VS Code bridge is running")
    .action(async () => {
      try {
        const health = await client.get<HealthResponse>("/health");
        console.log(`Bridge: ONLINE`);
        console.log(`Port:   ${health.port}`);
        console.log(`Uptime: ${health.uptime}s`);
        console.log(`Workspaces: ${health.workspaceCount}`);
      } catch {
        console.error("Bridge: OFFLINE");
        console.error(
          "Start the bridge: Ctrl+Shift+P > VSCode Controller: Start Bridge",
        );
        process.exit(1);
      }
    });
}
