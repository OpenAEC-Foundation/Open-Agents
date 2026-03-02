import type { CanvasConfig } from "@open-agents/shared";

const API_URL = process.env.OPEN_AGENTS_API_URL || "http://localhost:3001";

async function apiGet(path: string) {
  const res = await fetch(`${API_URL}/api${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPut(path: string, body: unknown) {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** Get the full canvas state (all configs) */
export async function getCanvasState() {
  const configs = await apiGet("/configs");
  return textResult(JSON.stringify(configs, null, 2));
}

/** Get agent configurations from the latest canvas */
export async function getAgentConfigs() {
  const configs: CanvasConfig[] = await apiGet("/configs");
  if (configs.length === 0) {
    return textResult("No canvas configurations found. Use create_agent to add agents.");
  }
  const latest = configs[configs.length - 1];
  const agents = latest.nodes.map((n) => ({
    id: n.id,
    name: n.data.name,
    model: n.data.model,
    systemPrompt: n.data.systemPrompt,
    tools: n.data.tools,
    position: n.position,
  }));
  return textResult(JSON.stringify(agents, null, 2));
}

/** Create a new agent node and save to the backend */
export async function createAgent(args: {
  name: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  x: number;
  y: number;
}) {
  // Get current canvas or create a new one
  const configs: CanvasConfig[] = await apiGet("/configs");
  const current: CanvasConfig = configs.length > 0
    ? configs[configs.length - 1]
    : { nodes: [], edges: [] };

  // Generate a unique node ID
  const existingIds = current.nodes.map((n) => n.id);
  let counter = current.nodes.length + 1;
  let nodeId = `agent-${counter}`;
  while (existingIds.includes(nodeId)) {
    counter++;
    nodeId = `agent-${counter}`;
  }

  const newNode = {
    id: nodeId,
    type: "agent" as const,
    position: { x: args.x, y: args.y },
    data: {
      name: args.name,
      model: args.model,
      systemPrompt: args.systemPrompt,
      tools: args.tools,
    },
  };

  current.nodes.push(newNode);

  // Save updated config
  if (current.id) {
    await apiPut(`/configs/${current.id}`, current);
  } else {
    const saved = await apiPost("/configs", current);
    current.id = saved.id;
  }

  return textResult(
    `Agent "${args.name}" created (${nodeId}) at position (${args.x}, ${args.y}). Model: ${args.model}.`,
  );
}

/** Update canvas: add/remove edges or remove nodes */
export async function updateCanvas(args: {
  action: "addEdge" | "removeEdge" | "removeNode";
  nodeId?: string;
  sourceId?: string;
  targetId?: string;
}) {
  const configs: CanvasConfig[] = await apiGet("/configs");
  if (configs.length === 0) {
    return textResult("No canvas configuration found. Create agents first.");
  }

  const current = configs[configs.length - 1];

  switch (args.action) {
    case "addEdge": {
      if (!args.sourceId || !args.targetId) {
        return textResult("sourceId and targetId are required for addEdge.");
      }
      const edgeId = `e-${args.sourceId}-${args.targetId}`;
      current.edges.push({
        id: edgeId,
        source: args.sourceId,
        target: args.targetId,
      });
      break;
    }
    case "removeEdge": {
      if (!args.sourceId || !args.targetId) {
        return textResult("sourceId and targetId are required for removeEdge.");
      }
      current.edges = current.edges.filter(
        (e) => !(e.source === args.sourceId && e.target === args.targetId),
      );
      break;
    }
    case "removeNode": {
      if (!args.nodeId) {
        return textResult("nodeId is required for removeNode.");
      }
      current.nodes = current.nodes.filter((n) => n.id !== args.nodeId);
      // Also remove connected edges
      current.edges = current.edges.filter(
        (e) => e.source !== args.nodeId && e.target !== args.nodeId,
      );
      break;
    }
  }

  if (current.id) {
    await apiPut(`/configs/${current.id}`, current);
  }

  return textResult(`Canvas updated: ${args.action} completed successfully.`);
}

/** List available preset templates */
export async function listTemplates() {
  const presets = await apiGet("/presets");
  return textResult(JSON.stringify(presets, null, 2));
}

/** Execute a canvas configuration */
export async function runFlow(args: { configId?: string }) {
  const configs: CanvasConfig[] = await apiGet("/configs");
  if (configs.length === 0) {
    return textResult("No canvas configuration found. Create agents first.");
  }

  const config = args.configId
    ? configs.find((c) => c.id === args.configId)
    : configs[configs.length - 1];

  if (!config) {
    return textResult(`Config "${args.configId}" not found.`);
  }

  const run = await apiPost("/execute", config);
  return textResult(
    `Execution started.\nRun ID: ${run.id}\nNodes: ${config.nodes.length}\nEdges: ${config.edges.length}`,
  );
}
