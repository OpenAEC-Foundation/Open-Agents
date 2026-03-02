import type {
  RunSummary,
  AuditEntry,
  AuditFilter,
  SSEEvent,
} from "@open-agents/shared";

import { getApiBase } from "./apiConfig";

/** Fetch all execution run summaries */
export async function fetchRuns(): Promise<RunSummary[]> {
  const res = await fetch(`${getApiBase()}/runs`);
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as RunSummary[];
}

/** Fetch a single run summary by ID */
export async function fetchRunSummary(runId: string): Promise<RunSummary> {
  const res = await fetch(`${getApiBase()}/runs/${runId}`);
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as RunSummary;
}

/** Fetch audit entries with optional filtering */
export async function fetchAuditEntries(filter: AuditFilter): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  const url = query
    ? `${getApiBase()}/audit?${query}`
    : `${getApiBase()}/audit`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as AuditEntry[];
}

/** Fetch replay events for a completed run */
export async function fetchReplayEvents(runId: string): Promise<SSEEvent[]> {
  const res = await fetch(`${getApiBase()}/audit/replay/${runId}`);
  if (!res.ok) {
    const err = (await res.json()) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SSEEvent[];
}
