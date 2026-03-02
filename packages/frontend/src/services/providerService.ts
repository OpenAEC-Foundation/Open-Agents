import type { ProviderConnection, ModelProvider } from "@open-agents/shared";

import { getApiBase } from "./apiConfig";


/** Fetch current provider connection statuses */
export async function fetchConnections(): Promise<ProviderConnection[]> {
  const res = await fetch(`${getApiBase()}/connect`);
  if (!res.ok) return [];
  const data = (await res.json()) as { providers: ProviderConnection[] };
  return data.providers;
}

/** Validate and store an API key for a provider */
export async function connectProvider(
  provider: ModelProvider,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${getApiBase()}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });

  const data = (await res.json()) as { status: string; error?: string };

  if (res.ok && data.status === "ok") {
    return { ok: true };
  }

  return { ok: false, error: data.error ?? "Validation failed" };
}

/** Disconnect a provider (remove API key) */
export async function disconnectProvider(provider: ModelProvider): Promise<void> {
  await fetch(`${getApiBase()}/connect/${provider}`, { method: "DELETE" });
}
