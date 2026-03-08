import type { Agent, Message, SpawnAgentBody } from '../types';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const API_BASE = IS_TAURI ? 'http://127.0.0.1:5174' : '';

const API = `${API_BASE}/api`;

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API}/agents`);
  return res.json();
}

export async function fetchAgentDetail(name: string): Promise<Agent> {
  const res = await fetch(`${API}/agents/${encodeURIComponent(name)}`);
  return res.json();
}

export async function spawnAgent(body: SpawnAgentBody): Promise<Agent> {
  const res = await fetch(`${API}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function killAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/kill`, {
    method: 'POST',
  });
}

export async function cleanAgents(): Promise<{ cleaned: string[] }> {
  const res = await fetch(`${API}/clean`, { method: 'POST' });
  return res.json();
}

export async function startSession(): Promise<void> {
  await fetch(`${API}/session/start`, { method: 'POST' });
}

// --- Messaging ---

export async function fetchMessages(name: string, unreadOnly = false): Promise<{ messages: Message[]; unread: number }> {
  const params = unreadOnly ? '?unread=true' : '';
  const res = await fetch(`${API}/messages/${encodeURIComponent(name)}${params}`);
  return res.json();
}

export async function sendMessage(from: string, to: string, content: string): Promise<void> {
  await fetch(`${API}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, content }),
  });
}

export async function broadcastMessage(from: string, content: string): Promise<void> {
  await fetch(`${API}/messages/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, content }),
  });
}

export async function markRead(name: string): Promise<void> {
  await fetch(`${API}/messages/${encodeURIComponent(name)}/read`, {
    method: 'POST',
  });
}

export async function pauseAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/pause`, { method: 'POST' });
}

export async function resumeAgent(name: string): Promise<void> {
  await fetch(`${API}/agents/${encodeURIComponent(name)}/resume`, { method: 'POST' });
}

export async function fetchPipelines(): Promise<Agent[]> {
  const res = await fetch(`${API}/pipeline`);
  return res.json();
}

// --- Teams ---

export async function fetchTeams(): Promise<unknown> {
  const res = await fetch(`${API}/teams`);
  return res.json();
}

export async function createTeam(name: string, members: string[]): Promise<unknown> {
  const res = await fetch(`${API}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, members }),
  });
  return res.json();
}

// --- Tasks ---

export async function fetchTasks(team: string): Promise<unknown> {
  const res = await fetch(`${API}/tasks/${encodeURIComponent(team)}`);
  return res.json();
}

export async function createTask(team: string, task: object): Promise<unknown> {
  const res = await fetch(`${API}/tasks/${encodeURIComponent(team)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  return res.json();
}

export async function updateTask(team: string, taskId: string, update: object): Promise<unknown> {
  const res = await fetch(`${API}/tasks/${encodeURIComponent(team)}/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.json();
}

// --- Checkpoints ---

export async function fetchCheckpoints(): Promise<unknown> {
  const res = await fetch(`${API}/checkpoints`);
  return res.json();
}

export async function resumeFromCheckpoint(agent: string): Promise<unknown> {
  const res = await fetch(`${API}/resume/${encodeURIComponent(agent)}`, { method: 'POST' });
  return res.json();
}

// --- Guardians ---

export async function fetchGuardians(): Promise<unknown> {
  const res = await fetch(`${API}/guardians`);
  return res.json();
}

export async function triggerGuardian(name: string): Promise<{ triggered: string[] }> {
  const res = await fetch(`${API}/guardians/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'manual_trigger', guardian: name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

// --- Templates ---

export interface BackendTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelHint: string;
  category: string;
}

export async function fetchTemplates(): Promise<BackendTemplate[]> {
  const res = await fetch(`${API}/templates`);
  if (!res.ok) {
    throw new Error(`GET /api/templates failed: ${res.status}`);
  }
  return res.json() as Promise<BackendTemplate[]>;
}

// --- Session ---

export async function fetchSessionStatus(): Promise<unknown> {
  const res = await fetch(`${API}/session/status`);
  return res.json();
}
