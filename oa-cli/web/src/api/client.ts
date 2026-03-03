import type { Agent, Message, SpawnAgentBody } from '../types';

const API = '/api';

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
