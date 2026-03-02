import { BRIDGE_BASE_URL } from "@open-agents/shared";

export class BridgeClient {
  private baseUrl: string;

  constructor(baseUrl: string = BRIDGE_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error || res.statusText);
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error: string }).error || res.statusText);
    }
    return res.json() as Promise<T>;
  }
}

export const client = new BridgeClient(
  process.env.VSCODE_CTRL_URL ?? BRIDGE_BASE_URL,
);
