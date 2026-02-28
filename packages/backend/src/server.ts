import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { configRoutes } from "./routes/configs.js";
import { executeRoutes } from "./routes/execute.js";
import { registerRuntime } from "./execution-engine.js";
import { ClaudeSDKRuntime } from "./runtimes/claude-sdk.js";

const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

// Register runtime adapters (D-015)
registerRuntime(new ClaudeSDKRuntime());

await app.register(cors, { origin: true });

// Register routes
app.register(healthRoutes, { prefix: "/api" });
app.register(configRoutes, { prefix: "/api" });
app.register(executeRoutes, { prefix: "/api" });

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Open-Agents backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
