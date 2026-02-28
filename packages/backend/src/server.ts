import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { configRoutes } from "./routes/configs.js";
import { executeRoutes } from "./routes/execute.js";
import { connectRoutes } from "./routes/connect.js";
import { chatRoutes } from "./routes/chat.js";
import { presetRoutes } from "./routes/presets.js";
import { registerRuntime } from "./execution-engine.js";
import { ClaudeSDKRuntime } from "./runtimes/claude-sdk.js";
import { OpenAIRuntime } from "./runtimes/openai.js";
import { MistralRuntime } from "./runtimes/mistral.js";
import { OllamaRuntime } from "./runtimes/ollama.js";

const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

// Register runtime adapters (D-015, D-032)
registerRuntime(new ClaudeSDKRuntime());
registerRuntime(new OpenAIRuntime());
registerRuntime(new MistralRuntime());
registerRuntime(new OllamaRuntime());

await app.register(cors, { origin: true });

// Register routes
app.register(healthRoutes, { prefix: "/api" });
app.register(configRoutes, { prefix: "/api" });
app.register(executeRoutes, { prefix: "/api" });
app.register(connectRoutes, { prefix: "/api" });
app.register(chatRoutes, { prefix: "/api" });
app.register(presetRoutes, { prefix: "/api" });

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`Open-Agents backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
