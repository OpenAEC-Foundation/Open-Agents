// Allow Agent SDK to spawn Claude Code subprocesses even when our backend
// is started from within a Claude Code terminal session.
// The SDK checks CLAUDECODE to prevent nesting; we must clear all
// Claude-injected env vars so the subprocess starts cleanly.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("CLAUDE") || key === "AUTO_CLAUDE_DEBUG") {
    delete process.env[key];
  }
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import { healthRoutes } from "./routes/health.js";
import { configRoutes } from "./routes/configs.js";
import { executeRoutes } from "./routes/execute.js";
import { connectRoutes } from "./routes/connect.js";
import { chatRoutes } from "./routes/chat.js";
import { presetRoutes } from "./routes/presets.js";
import { agentRoutes } from "./routes/agents.js";
import { safetyRoutes } from "./routes/safety.js";
import { auditRoutes } from "./routes/audit.js";
import { templateRoutes } from "./routes/templates.js";
import { generateRoutes } from "./routes/generate.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { instructionRoutes } from "./routes/instructions.js";
import { assistantRoutes } from "./routes/assistant.js";
import { assemblyRoutes } from "./routes/assembly.js";
import { terminalRoutes } from "./routes/terminal.js";
import { registerRuntime } from "./execution-engine.js";
import { ClaudeSDKRuntime } from "./runtimes/claude-sdk.js";
import { OpenAIRuntime } from "./runtimes/openai.js";
import { MistralRuntime } from "./runtimes/mistral.js";
import { OllamaRuntime } from "./runtimes/ollama.js";
import { ClaudeCLIRuntime } from "./runtimes/claude-cli.js";
import { OaCLIRuntime } from "./runtimes/oa-cli.js";
import { DockerRuntime } from "./runtimes/docker-runtime.js";

const PORT = Number(process.env.PORT) || 3001;
const BRIDGE_URL = process.env.VSCODE_BRIDGE_URL ?? "http://localhost:7483";

const app = Fastify({ logger: true });

// Register runtime adapters (D-015, D-032)
registerRuntime(new ClaudeSDKRuntime());
registerRuntime(new OpenAIRuntime());
registerRuntime(new MistralRuntime());
registerRuntime(new OllamaRuntime());

// Register Docker runtime — isolated container execution (D-040)
const dockerRuntime = new DockerRuntime();
dockerRuntime.isAvailable().then((ok) => {
  if (ok) {
    registerRuntime(dockerRuntime);
    app.log.info("Docker detected — docker runtime available for isolated agent execution");
  } else {
    app.log.info("Docker not detected — docker runtime disabled");
  }
});

// Register CLI runtime — connects to VS Code bridge for terminal-based Claude agents
const cliRuntime = new ClaudeCLIRuntime(BRIDGE_URL);
cliRuntime.isAvailable().then((ok) => {
  if (ok) {
    registerRuntime(cliRuntime);
    app.log.info(`VS Code bridge connected at ${BRIDGE_URL} — cli/claude runtime available`);
  } else {
    app.log.info(`VS Code bridge not detected at ${BRIDGE_URL} — cli/claude runtime disabled (start EH with F5)`);
  }
});

// Register oa-cli (tmux) runtime — connects to oa-cli for tmux-based agent sessions
const oaCLIRuntime = new OaCLIRuntime();
oaCLIRuntime.isAvailable().then((ok) => {
  if (ok) {
    registerRuntime(oaCLIRuntime);
    app.log.info("oa-cli detected — tmux/claude runtime available");
  } else {
    app.log.info("oa-cli not detected — tmux runtime disabled (run: oa start)");
  }
});

await app.register(cors, { origin: true });
await app.register(fastifyWebsocket);

// Register routes
app.register(healthRoutes, { prefix: "/api" });
app.register(configRoutes, { prefix: "/api" });
app.register(executeRoutes, { prefix: "/api" });
app.register(connectRoutes, { prefix: "/api" });
app.register(chatRoutes, { prefix: "/api" });
app.register(presetRoutes, { prefix: "/api" });
app.register(agentRoutes, { prefix: "/api" });
app.register(safetyRoutes, { prefix: "/api" });
app.register(auditRoutes, { prefix: "/api" });
app.register(templateRoutes, { prefix: "/api" });
app.register(generateRoutes, { prefix: "/api" });
app.register(knowledgeRoutes, { prefix: "/api" });
app.register(instructionRoutes, { prefix: "/api" });
app.register(assistantRoutes, { prefix: "/api" });
app.register(assemblyRoutes, { prefix: "/api" });
// Terminal WebSocket route — ws://host/ws/terminal (no /api prefix, WebSocket upgrade)
app.register(terminalRoutes, { prefix: "/ws" });

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Open-Agents backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
