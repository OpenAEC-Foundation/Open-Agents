import type {
  SafetyConfig,
  GlobalSafetyRules,
  AgentSafetyRules,
  SafetyTestResult,
  AgentTool,
} from "@open-agents/shared";

import { getApiBase } from "./apiConfig";

/** Fetch the current safety configuration */
export async function fetchSafetyConfig(): Promise<SafetyConfig> {
  const res = await fetch(`${getApiBase()}/safety`);
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SafetyConfig;
}

/** Update the global safety rules */
export async function updateGlobalRules(
  rules: Partial<GlobalSafetyRules>,
): Promise<SafetyConfig> {
  const res = await fetch(`${getApiBase()}/safety/global`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SafetyConfig;
}

/** Set safety rules for a specific agent node */
export async function setNodeRules(
  nodeId: string,
  rules: AgentSafetyRules,
): Promise<SafetyConfig> {
  const res = await fetch(`${getApiBase()}/safety/node/${nodeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SafetyConfig;
}

/** Remove safety rule overrides for a specific agent node */
export async function removeNodeRules(nodeId: string): Promise<SafetyConfig> {
  const res = await fetch(`${getApiBase()}/safety/node/${nodeId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SafetyConfig;
}

/** Test whether a command would be allowed by the safety rules */
export async function testSafetyCommand(
  nodeId: string,
  command: string,
  agentTools: AgentTool[],
): Promise<SafetyTestResult> {
  const res = await fetch(`${getApiBase()}/safety/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodeId, command, agentTools }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SafetyTestResult;
}
