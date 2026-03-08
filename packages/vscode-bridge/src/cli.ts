#!/usr/bin/env node
/**
 * open-agents-bridge CLI
 *
 * The VS Code bridge runs inside the VS Code extension host and requires
 * the VS Code API. Use this CLI to check bridge status or get usage info.
 *
 * To start the bridge: open VS Code with this extension installed, then
 * run the "Open-Agents: Start Bridge" command or press F5 in the extension
 * development host.
 */

import { BRIDGE_BASE_URL, BRIDGE_PORT } from "@open-agents/shared";

const [, , command = "status"] = process.argv;

async function checkStatus(): Promise<void> {
  try {
    const res = await fetch(`${BRIDGE_BASE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Bridge is running on port ${BRIDGE_PORT}`);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Bridge responded with status ${res.status}`);
      process.exit(1);
    }
  } catch {
    console.log(`Bridge is not running at ${BRIDGE_BASE_URL}`);
    console.log("Start it by opening VS Code and running: Open-Agents: Start Bridge");
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`open-agents-bridge — VS Code Bridge CLI

Usage:
  open-agents-bridge [command]

Commands:
  status   Check if the bridge is running (default)
  help     Show this help

The bridge runs inside VS Code. Start it with:
  - Command: "Open-Agents: Start Bridge"
  - Or press F5 in the extension development host

Bridge URL: ${BRIDGE_BASE_URL}
`);
}

switch (command) {
  case "status":
    await checkStatus();
    break;
  case "help":
  case "--help":
  case "-h":
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
