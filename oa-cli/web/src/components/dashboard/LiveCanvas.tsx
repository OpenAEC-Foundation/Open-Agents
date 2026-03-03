import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeProps,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAgentStore, statusColor, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import type { Agent, Message } from '../../types';
import * as api from '../../api/client';

// --- Agent Node Component ---

function AgentNodeComponent({ data }: NodeProps) {
  const agent = data.agent as Agent;
  const msgs = (data.unread ?? 0) as number;
  const selected = data.selected as boolean;
  const sColor = statusColor(agent.status);
  const mColor = modelColor(agent.model);

  return (
    <div
      className="relative rounded-xl border-2 px-4 py-3 min-w-[180px] max-w-[240px] transition-all duration-200"
      style={{
        borderColor: selected ? '#22d3ee' : sColor,
        background: selected ? 'rgba(34,211,238,0.08)' : 'rgba(30,30,30,0.95)',
        boxShadow: agent.status === 'running'
          ? `0 0 12px ${sColor}40`
          : selected
          ? '0 0 12px rgba(34,211,238,0.3)'
          : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-600 !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-neutral-600 !w-2 !h-2 !border-0" />

      {/* Status indicator */}
      <div
        className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-neutral-900"
        style={{
          background: sColor,
          animation: agent.status === 'running' ? 'ccPulse 2s infinite' : 'none',
        }}
      />

      {/* Unread badge */}
      {msgs > 0 && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {msgs}
        </div>
      )}

      {/* Name */}
      <div className="text-sm font-semibold text-white truncate">{agent.name}</div>

      {/* Model badge */}
      <div className="flex items-center gap-1.5 mt-1">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ background: `${mColor}20`, color: mColor }}
        >
          {modelLabel(agent.model)}
        </span>
        <span className="text-[10px] text-neutral-500">
          {formatDuration(agent.created_at, agent.finished_at)}
        </span>
      </div>

      {/* Task */}
      <div className="text-[11px] text-neutral-400 mt-1.5 line-clamp-2 leading-tight">
        {agent.task}
      </div>
    </div>
  );
}

const nodeTypes = { agentLive: AgentNodeComponent };

// --- Layout helpers ---

function layoutAgents(agents: Agent[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Group by parent
  const roots = agents.filter(a => !a.parent || !agents.find(p => p.name === a.parent));
  const childrenOf: Record<string, Agent[]> = {};
  for (const a of agents) {
    if (a.parent && agents.find(p => p.name === a.parent)) {
      if (!childrenOf[a.parent]) childrenOf[a.parent] = [];
      childrenOf[a.parent].push(a);
    }
  }

  // Recursive layout
  const X_GAP = 260;
  const Y_GAP = 160;
  let colOffset = 0;

  function placeTree(agent: Agent, depth: number, col: number): number {
    const children = childrenOf[agent.name] || [];
    if (children.length === 0) {
      nodes.push({
        id: agent.name,
        type: 'agentLive',
        position: { x: col * X_GAP, y: depth * Y_GAP },
        data: { agent, unread: agent.unread_messages ?? 0, selected: false },
      });
      return col;
    }

    let startCol = col;
    for (const child of children.sort((a, b) => a.created_at - b.created_at)) {
      col = placeTree(child, depth + 1, col) + 1;
    }
    const endCol = col - 1;
    const parentCol = (startCol + endCol) / 2;

    nodes.push({
      id: agent.name,
      type: 'agentLive',
      position: { x: parentCol * X_GAP, y: depth * Y_GAP },
      data: { agent, unread: agent.unread_messages ?? 0, selected: false },
    });

    // Edges to children
    for (const child of children) {
      edges.push({
        id: `${agent.name}->${child.name}`,
        source: agent.name,
        target: child.name,
        animated: child.status === 'running',
        style: { stroke: '#555', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#555' },
      });
    }

    return endCol;
  }

  for (const root of roots.sort((a, b) => a.created_at - b.created_at)) {
    colOffset = placeTree(root, 0, colOffset) + 2; // gap between trees
  }

  return { nodes, edges };
}

// --- Main Component ---

export function LiveCanvas() {
  const agents = useAgentStore(s => s.agents);
  const selectedAgent = useAgentStore(s => s.selectedAgent);
  const selectAgent = useAgentStore(s => s.selectAgent);
  const [messageEdges, setMessageEdges] = useState<Edge[]>([]);
  const messageCache = useRef<Map<string, Message[]>>(new Map());

  // Fetch messages for all agents
  useEffect(() => {
    if (agents.length === 0) return;

    async function fetchAllMessages() {
      const newEdges: Edge[] = [];
      const edgeSeen = new Set<string>();

      for (const agent of agents) {
        try {
          const { messages } = await api.fetchMessages(agent.name);
          messageCache.current.set(agent.name, messages);

          // Create edges for recent messages (last 5 per agent)
          const recent = messages.slice(0, 5);
          for (const msg of recent) {
            const fromAgent = agents.find(a => a.name === msg.from);
            const toAgent = agents.find(a => a.name === msg.to) || (msg.to === agent.name ? agent : null);
            if (!fromAgent || !toAgent) continue;

            const edgeId = `msg-${msg.from}->${msg.to}-${Math.floor(msg.timestamp)}`;
            if (edgeSeen.has(edgeId)) continue;
            edgeSeen.add(edgeId);

            const snippet = msg.content.length > 30 ? msg.content.slice(0, 27) + '...' : msg.content;
            newEdges.push({
              id: edgeId,
              source: msg.from,
              target: msg.to === '_broadcast' ? msg.from : msg.to,
              animated: true,
              label: snippet,
              labelStyle: { fill: '#fbbf24', fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: '#1a1a1a', fillOpacity: 0.9 },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 4,
              style: { stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '5 3' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
            });
          }
        } catch {
          // agent might not have messages
        }
      }
      setMessageEdges(newEdges);
    }

    fetchAllMessages();
    const interval = setInterval(fetchAllMessages, 3000);
    return () => clearInterval(interval);
  }, [agents]);

  // Build layout
  const { nodes: layoutNodes, edges: hierarchyEdges } = useMemo(
    () => layoutAgents(agents),
    [agents]
  );

  // Mark selected
  const nodes = useMemo(
    () => layoutNodes.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === selectedAgent },
    })),
    [layoutNodes, selectedAgent]
  );

  // Combine hierarchy edges + message edges
  const allEdges = useMemo(
    () => [...hierarchyEdges, ...messageEdges],
    [hierarchyEdges, messageEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => selectAgent(node.id),
    [selectAgent]
  );

  const onPaneClick = useCallback(() => selectAgent(null), [selectAgent]);

  if (agents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <div className="text-4xl mb-4">&#x1f916;</div>
          <div className="text-lg font-medium">No agents running</div>
          <div className="text-sm mt-1">Spawn agents with <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-cyan-400">oa run</code></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={allEdges}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-oa-bg"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#555', strokeWidth: 1.5 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#262626" />
        <Controls
          showInteractive={false}
          className="!bg-neutral-900 !border-neutral-700 !rounded-lg [&>button]:!bg-neutral-900 [&>button]:!border-neutral-700 [&>button]:!text-neutral-400 [&>button:hover]:!bg-neutral-800"
        />
        <MiniMap
          nodeColor={(n) => {
            const agent = (n.data as any)?.agent as Agent | undefined;
            return agent ? statusColor(agent.status) : '#555';
          }}
          className="!bg-neutral-900 !border-neutral-700 !rounded-lg"
          maskColor="rgba(0,0,0,0.5)"
        />
      </ReactFlow>
    </div>
  );
}
