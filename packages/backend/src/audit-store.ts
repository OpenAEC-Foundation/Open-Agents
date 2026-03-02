import { nanoid } from "nanoid";
import type { AuditEntry, AuditFilter, AuditStatus, RunSummary } from "@open-agents/shared";

/**
 * In-memory audit trail store (D-035).
 * Logs execution events and provides run summaries.
 * Follows the same in-memory pattern as key-store.ts.
 */

const entries = new Map<string, AuditEntry[]>();
const summaries = new Map<string, RunSummary>();

/** Add an audit entry, indexed by runId. Returns the entry with a generated id. */
export function logEntry(entry: Omit<AuditEntry, "id">): AuditEntry {
  const full: AuditEntry = { ...entry, id: nanoid() };

  const list = entries.get(full.runId);
  if (list) {
    list.push(full);
  } else {
    entries.set(full.runId, [full]);
  }

  return full;
}

/** Get all entries for a run. */
export function getEntries(runId: string): AuditEntry[] {
  return entries.get(runId) ?? [];
}

/** Query entries matching ALL provided filter fields. */
export function queryEntries(filter: AuditFilter): AuditEntry[] {
  const results: AuditEntry[] = [];

  const source: Iterable<AuditEntry[]> = filter.runId
    ? [entries.get(filter.runId) ?? []]
    : entries.values();

  for (const list of source) {
    for (const entry of list) {
      if (filter.runId && entry.runId !== filter.runId) continue;
      if (filter.nodeId && entry.nodeId !== filter.nodeId) continue;
      if (filter.agentName && !entry.agentName.toLowerCase().includes(filter.agentName.toLowerCase())) continue;
      if (filter.tool && entry.tool !== filter.tool) continue;
      if (filter.status && entry.status !== filter.status) continue;
      if (filter.fromDate && entry.timestamp < filter.fromDate) continue;
      if (filter.toDate && entry.timestamp > filter.toDate) continue;

      results.push(entry);
    }
  }

  return results;
}

/** Create a new run summary with status "running" and zero entry counts. */
export function createRunSummary(
  id: string,
  configId: string,
  configName: string | undefined,
  nodeCount: number,
  startedAt: string,
): void {
  summaries.set(id, {
    id,
    configId,
    configName,
    status: "running",
    nodeCount,
    startedAt,
    entryCounts: { success: 0, error: 0, blocked: 0 },
  });
}

/** Update fields on an existing run summary. */
export function updateRunSummary(runId: string, patch: Partial<RunSummary>): void {
  const existing = summaries.get(runId);
  if (!existing) return;
  summaries.set(runId, { ...existing, ...patch });
}

/** List all run summaries, sorted by startedAt descending. */
export function getRuns(): RunSummary[] {
  return [...summaries.values()].sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
}

/** Get a single run summary by id. */
export function getRunSummary(runId: string): RunSummary | undefined {
  return summaries.get(runId);
}
