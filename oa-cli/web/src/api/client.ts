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
