import type { FastifyInstance } from "fastify";
import type { ConnectRequest, ConnectResponse, ModelProvider } from "@open-agents/shared";
import { setApiKey, removeApiKey, getConnections } from "../key-store.js";

/** Validate an Anthropic API key by making a minimal API call */
async function validateAnthropicKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    const msg = (body as Record<string, unknown>)?.error
      ? String((body as Record<string, Record<string, unknown>>).error?.message ?? "Unknown error")
      : `HTTP ${res.status}`;

    // 401 = invalid key, 403 = no access, 429 = rate limited (key is valid though)
    if (res.status === 429) return { ok: true };
    return { ok: false, error: msg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Validate an OpenAI API key */
async function validateOpenAIKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok || res.status === 429) return { ok: true };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

const validators: Partial<Record<ModelProvider, (key: string) => Promise<{ ok: boolean; error?: string }>>> = {
  anthropic: validateAnthropicKey,
  openai: validateOpenAIKey,
};

export async function connectRoutes(app: FastifyInstance) {
  // Validate and store an API key
  app.post<{ Body: ConnectRequest }>("/connect", async (request, reply) => {
    const { provider, apiKey } = request.body;

    if (!provider || !apiKey) {
      reply.code(400);
      return { status: "error", provider: provider ?? "anthropic", error: "Provider and apiKey are required" } satisfies ConnectResponse;
    }

    const validate = validators[provider];
    if (!validate) {
      // For providers without validation (ollama, mistral without validator), just store
      setApiKey(provider, apiKey);
      return { status: "ok", provider } satisfies ConnectResponse;
    }

    const result = await validate(apiKey);
    if (!result.ok) {
      reply.code(401);
      return { status: "error", provider, error: result.error ?? "Invalid API key" } satisfies ConnectResponse;
    }

    setApiKey(provider, apiKey);
    return { status: "ok", provider } satisfies ConnectResponse;
  });

  // Disconnect a provider
  app.delete<{ Params: { provider: string } }>("/connect/:provider", async (request) => {
    removeApiKey(request.params.provider as ModelProvider);
    return { status: "ok" };
  });

  // Get connection status for all providers
  app.get("/connect", async () => {
    return { providers: getConnections() };
  });
}
