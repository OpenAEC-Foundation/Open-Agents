import type { ModelProvider, ProviderConnection } from "@open-agents/shared";

/**
 * In-memory API key store (D-013 + BYOK extension).
 * Keys are stored in memory only — never persisted to disk.
 * Falls back to environment variables (ANTHROPIC_API_KEY, etc.)
 */

const keys = new Map<ModelProvider, string>();
const connections = new Map<ModelProvider, ProviderConnection>();

/** Mask an API key for safe display (e.g. "sk-ant-api03-...xyz") */
function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

/** Store a validated API key for a provider */
export function setApiKey(provider: ModelProvider, key: string): void {
  keys.set(provider, key);
  connections.set(provider, {
    provider,
    status: "connected",
    maskedKey: maskKey(key),
    connectedAt: new Date().toISOString(),
  });
}

/** Get the API key for a provider. Checks store first, then env vars. */
export function getApiKey(provider: ModelProvider): string | undefined {
  // User-provided key takes precedence
  const stored = keys.get(provider);
  if (stored) return stored;

  // Fall back to environment variables
  const envMap: Record<string, string | undefined> = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
  };

  return envMap[provider];
}

/** Remove a provider's API key */
export function removeApiKey(provider: ModelProvider): void {
  keys.delete(provider);
  connections.set(provider, { provider, status: "disconnected" });
}

/** Get connection status for all providers */
export function getConnections(): ProviderConnection[] {
  const providers: ModelProvider[] = ["anthropic", "openai", "mistral", "ollama"];
  return providers.map((provider) => {
    const conn = connections.get(provider);
    if (conn) return conn;

    // Check env var fallback
    const envKey = getApiKey(provider);
    if (envKey) {
      return {
        provider,
        status: "connected" as const,
        maskedKey: maskKey(envKey),
      };
    }

    return { provider, status: "disconnected" as const };
  });
}
