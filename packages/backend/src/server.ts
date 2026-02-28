import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { configRoutes } from "./routes/configs.js";
import { executeRoutes } from "./routes/execute.js";

const PORT = Number(process.env.PORT) || 3001;

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Register routes
app.register(healthRoutes, { prefix: "/api" });
app.register(configRoutes, { prefix: "/api" });
app.register(executeRoutes, { prefix: "/api" });

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Open-Agents backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
