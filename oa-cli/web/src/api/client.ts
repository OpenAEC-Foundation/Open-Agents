import type { Agent, ProposalsData, SpawnAgentBody } from '../types';

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

export async function fetchProposals(name: string): Promise<ProposalsData> {
  const res = await fetch(`${API}/agents/${encodeURIComponent(name)}/proposals`);
  return res.json();
}

export async function applyProposal(agent: string, filename: string): Promise<void> {
  await fetch(
    `${API}/agents/${encodeURIComponent(agent)}/proposals/${encodeURIComponent(filename)}/apply`,
    { method: 'POST' }
  );
}
