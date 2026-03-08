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
  type NodeChange,
  BackgroundVariant,
  type NodeProps,
  MarkerType,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAgentStore, statusColor, modelColor, formatDuration, modelLabel } from '../../stores/agentStore';
import type { Agent, Message } from '../../types';
import * as api from '../../api/client';
import { CheckCircle2, XCircle, Clock, Bot } from 'lucide-react';

// --- Agent Node Component ---

function AgentNodeComponent({ data }: NodeProps) {
  const agent = data.agent as Agent;
  const msgs = (data.unread ?? 0) as number;
  const selected = data.selected as boolean;
  const sColor = statusColor(agent.status);
  const mColor = modelColor(agent.model);

  const isRunning = agent.status === 'running';
  const isDone = agent.status === 'done';
  const isFailed = agent.status === 'failed' || agent.status === 'error';

  return (
    <div
      className="relative rounded-lg min-w-[220px] max-w-[280px] transition-all duration-200 group"
      style={{
        borderLeft: `4px solid ${selected ? '#f97316' : sColor}`,
        background: selected
          ? 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(15,15,17,0.98) 100%)'
          : 'linear-gradient(135deg, rgba(23,23,23,0.98) 0%, rgba(10,10,12,0.99) 100%)',
        boxShadow: isRunning
          ? `0 0 16px ${sColor}35, 0 4px 12px rgba(0,0,0,0.5)`
          : selected
          ? '0 0 14px rgba(249,115,22,0.2), 0 4px 12px rgba(0,0,0,0.5)'
          : '0 4px 12px rgba(0,0,0,0.5)',
        border: `1px solid ${selected ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderLeftWidth: '4px',
        borderLeftColor: selected ? '#f97316' : sColor,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 group-hover:!opacity-100 !transition-opacity !bg-neutral-500 !w-2 !h-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 group-hover:!opacity-100 !transition-opacity !bg-neutral-500 !w-2 !h-2 !border-0"
      />

      <div className="px-3 py-2.5">
        {/* Header row: icon + name + status badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <Bot size={13} className="text-neutral-500 shrink-0" />
          <div className="text-[13px] font-bold text-white truncate flex-1 leading-tight">
            {agent.name}
          </div>
          {/* Status icon top-right */}
          <div className="shrink-0 ml-auto">
            {isRunning && (
              <span
                className="block w-2.5 h-2.5 rounded-full"
                style={{ background: sColor, animation: 'ccPulse 2s infinite' }}
              />
            )}
            {isDone && <CheckCircle2 size={13} color="#22c55e" />}
            {isFailed && <XCircle size={13} color="#ef4444" />}
          </div>
        </div>

        {/* Model badge + duration */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none"
            style={{ background: `${mColor}22`, color: mColor, border: `1px solid ${mColor}33` }}
          >
            {modelLabel(agent.model)}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-0.5">
            <Clock size={9} />
            {formatDuration(agent.created_at, agent.finished_at)}
          </span>
        </div>

        {/* Task text */}
        {agent.task && (
          <div className="text-[11px] text-neutral-400 italic line-clamp-2 leading-tight">
            {agent.task}
          </div>
        )}
      </div>

      {/* Unread badge */}
      {msgs > 0 && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
          {msgs}
        </div>
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.025)' }}
      />
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
  // PERF: Cap messageCache to prevent unbounded memory growth in long sessions
  const MAX_CACHE_SIZE = 500;

  // Persist user-dragged positions — only auto-layout NEW agents
  const manualPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Local controlled nodes state — needed so applyNodeChanges works during drag
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);

  // Fetch messages for all agents
  useEffect(() => {
    if (agents.length === 0) return;

    async function fetchAllMessages() {
      const newEdges: Edge[] = [];
      const edgeSeen = new Set<string>();

      for (const agent of agents) {
        try {
          const { messages } = await api.fetchMessages(agent.name);
          // PERF: Evict oldest entry when cache exceeds MAX_CACHE_SIZE
          if (messageCache.current.size >= MAX_CACHE_SIZE && !messageCache.current.has(agent.name)) {
            const oldestKey = messageCache.current.keys().next().value;
            if (oldestKey !== undefined) messageCache.current.delete(oldestKey);
          }
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

  // Build layout — preserve user-dragged positions for existing agents
  const { nodes: layoutNodes, edges: hierarchyEdges } = useMemo(
    () => layoutAgents(agents),
    [agents]
  );

  // Sync layoutNodes → flowNodes, but preserve manualPositions for known nodes
  useEffect(() => {
    setFlowNodes(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));
      return layoutNodes.map(n => ({
        ...n,
        // Use manual position if available, else fall back to auto-layout
        position: manualPositions.current.get(n.id) ?? n.position,
        data: { ...n.data, selected: n.id === selectedAgent },
        // Preserve dragging state from previous render to avoid flicker
        dragging: prevMap.get(n.id)?.dragging ?? false,
      }));
    });
  }, [layoutNodes, selectedAgent]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Persist drag positions (both during and after drag)
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        manualPositions.current.set(change.id, change.position);
      }
    }
    setFlowNodes(prev => applyNodeChanges(changes, prev));
  }, []);

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
          <div className="text-sm mt-1">Spawn agents with <code className="px-1.5 py-0.5 rounded text-oa-accent" style={{ background: 'rgba(249,115,22,0.12)' }}>oa run</code></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={allEdges}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
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
