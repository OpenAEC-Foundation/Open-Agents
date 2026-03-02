import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";

const MCP_JSON = {
  mcpServers: {
    "open-agents-bridge": {
      command: "node",
      args: ["__MCP_SERVER_PATH__"],
      env: {
        VSCODE_CTRL_URL: "http://localhost:7483",
      },
    },
  },
};

const CLAUDE_MD_SECTION = `
## VS Code Bridge (Open-Agents)

Er draait een HTTP bridge op \`http://localhost:7483\` waarmee je VS Code volledig extern kunt besturen.
MCP tools zijn beschikbaar als de bridge draait (start met F5 of het "Open-Agents: Start Bridge" command).

### Quick Reference (curl)

\`\`\`bash
# Health check
curl http://localhost:7483/health

# Actieve editor info
curl http://localhost:7483/active-editor

# Open bestanden
curl http://localhost:7483/open-files

# Bestand openen op regel 42
curl -X POST http://localhost:7483/open-file -H "Content-Type: application/json" -d '{"path":"/pad/naar/bestand.ts","line":42}'

# Tekst lezen (regels 10-20)
curl -X POST http://localhost:7483/get-text -H "Content-Type: application/json" -d '{"startLine":10,"endLine":20}'

# VS Code command uitvoeren
curl -X POST http://localhost:7483/execute-command -H "Content-Type: application/json" -d '{"command":"editor.action.formatDocument"}'

# Tekst naar terminal sturen
curl -X POST http://localhost:7483/send-text -H "Content-Type: application/json" -d '{"text":"npm test"}'
\`\`\`

### Alle Endpoints

**GET endpoints (geen body nodig):**
- \`/health\` - Bridge status
- \`/workspace-state\` - Workspace naam en folders
- \`/window-state\` - Window focus status
- \`/active-editor\` - Actief bestand, cursor, selectie
- \`/open-files\` - Alle open tabs
- \`/terminals\` - Open terminals
- \`/extensions\` - Geinstalleerde extensies
- \`/debug-state\` - Debug sessies
- \`/scm-state\` - Git status
- \`/tasks\` - Beschikbare tasks

**POST endpoints (JSON body):**
- \`/open-file\` - \`{path, line?, character?, preview?}\`
- \`/close-editor\` - \`{path?, all?}\`
- \`/get-text\` - \`{path?, startLine?, endLine?}\`
- \`/insert-text\` - \`{path?, line, text}\`
- \`/replace-text\` - \`{path?, startLine, endLine, text}\`
- \`/set-cursor\` - \`{line, character?}\`
- \`/reveal-line\` - \`{line}\`
- \`/save-file\` - \`{path?}\`
- \`/file-exists\` - \`{path}\`
- \`/read-file\` - \`{path, encoding?}\`
- \`/write-file\` - \`{path, content, createDirectories?}\`
- \`/delete-file\` - \`{path, recursive?, useTrash?}\`
- \`/rename-file\` - \`{oldPath, newPath, overwrite?}\`
- \`/create-directory\` - \`{path}\`
- \`/list-directory\` - \`{path, recursive?}\`
- \`/create-terminal\` - \`{name?, cwd?, show?}\`
- \`/send-text\` - \`{text, terminalId?, addNewLine?}\`
- \`/kill-terminal\` - \`{terminalId?}\`
- \`/execute-command\` - \`{command, args?}\`
- \`/start-debug\` - \`{configName?, workspaceFolder?}\`
- \`/stop-debug\` - \`{}\`
- \`/run-task\` - \`{label}\`

Regelnummers zijn 1-based. Zonder \`path\` parameter werken editor-endpoints op de actieve editor.
`;

function findMcpServerPath(): string {
  // Try to find the built mcp-server.js relative to the CLI binary
  const cliDir = path.dirname(process.argv[1] || __filename);
  const candidates = [
    // Monorepo layout: packages/cli/dist -> packages/vscode-bridge/dist
    path.resolve(cliDir, "../../vscode-bridge/dist/mcp-server.js"),
    // Global install or npx
    path.resolve(cliDir, "../vscode-bridge/dist/mcp-server.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback: return a placeholder that the user can edit
  return "<path-to>/packages/vscode-bridge/dist/mcp-server.js";
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description(
      "Bootstrap workspace with .mcp.json and CLAUDE.md for VS Code bridge context",
    )
    .option(
      "--dir <directory>",
      "Target directory (default: current directory)",
    )
    .option("--mcp-only", "Only create .mcp.json, skip CLAUDE.md")
    .option("--claude-only", "Only update CLAUDE.md, skip .mcp.json")
    .action(
      (opts: { dir?: string; mcpOnly?: boolean; claudeOnly?: boolean }) => {
        const targetDir = path.resolve(opts.dir || process.cwd());

        if (!fs.existsSync(targetDir)) {
          console.error(`Directory does not exist: ${targetDir}`);
          process.exit(1);
        }

        let created = 0;

        // Create .mcp.json
        if (!opts.claudeOnly) {
          const mcpPath = path.join(targetDir, ".mcp.json");
          const mcpServerPath = findMcpServerPath();
          const mcpContent = JSON.parse(JSON.stringify(MCP_JSON));
          mcpContent.mcpServers["open-agents-bridge"].args[0] = mcpServerPath;

          if (fs.existsSync(mcpPath)) {
            // Merge into existing .mcp.json
            try {
              const existing = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
              existing.mcpServers = existing.mcpServers || {};
              existing.mcpServers["open-agents-bridge"] =
                mcpContent.mcpServers["open-agents-bridge"];
              fs.writeFileSync(mcpPath, JSON.stringify(existing, null, 2) + "\n");
              console.log(`  Updated: ${mcpPath} (merged open-agents-bridge server)`);
            } catch {
              console.error(
                `  Skipped: ${mcpPath} (exists but not valid JSON)`,
              );
            }
          } else {
            fs.writeFileSync(
              mcpPath,
              JSON.stringify(mcpContent, null, 2) + "\n",
            );
            console.log(`  Created: ${mcpPath}`);
          }
          created++;
        }

        // Update CLAUDE.md
        if (!opts.mcpOnly) {
          const claudePath = path.join(targetDir, "CLAUDE.md");

          if (fs.existsSync(claudePath)) {
            const existing = fs.readFileSync(claudePath, "utf-8");
            if (existing.includes("VS Code Bridge")) {
              console.log(
                `  Skipped: ${claudePath} (already contains VS Code Bridge section)`,
              );
            } else {
              fs.appendFileSync(claudePath, "\n" + CLAUDE_MD_SECTION);
              console.log(
                `  Updated: ${claudePath} (appended VS Code Bridge section)`,
              );
              created++;
            }
          } else {
            fs.writeFileSync(
              claudePath,
              `# ${path.basename(targetDir)}\n${CLAUDE_MD_SECTION}`,
            );
            console.log(`  Created: ${claudePath}`);
            created++;
          }
        }

        if (created > 0) {
          console.log(
            "\nDone! Claude Code will now have VS Code bridge context when starting in this workspace.",
          );
          console.log(
            "Make sure the bridge is running (F5 in Extension Dev Host or start via command palette).",
          );
        }
      },
    );
}
