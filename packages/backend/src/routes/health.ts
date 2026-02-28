import type { FastifyInstance } from "fastify";
import type { HealthResponse } from "@open-agents/shared";
import { getConnections } from "../key-store.js";

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      version: "0.1.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      providers: getConnections(),
    };
  });
}
