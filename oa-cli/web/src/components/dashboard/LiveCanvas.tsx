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

function statusBorderColor(status: string): string {
  switch (status) {
    case 'running': return '#3b82f6';
    case 'done': return '#22c55e';
    case 'failed':
    case 'error': return '#ef4444';
    case 'killed':
    case 'timeout': return '#9ca3af';
    default: return '#9ca3af';
  }
}

function AgentNodeComponent({ data }: NodeProps) {
  const agent = data.agent as Agent;
  const msgs = (data.unread ?? 0) as number;
  const selected = data.selected as boolean;
  const mColor = modelColor(agent.model);

  const isRunning = agent.status === 'running';
  const isDone = agent.status === 'done';
  const isFailed = agent.status === 'failed' || agent.status === 'error';

  const borderColor = statusBorderColor(agent.status);

  const boxShadow = selected
    ? `0 0 0 2px #ff6b35, 0 4px 16px rgba(0,0,0,0.12)`
    : isRunning
    ? `0 0 12px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.08)`
    : '0 2px 8px rgba(0,0,0,0.08)';

  return (
    <div
      className="relative rounded-lg min-w-[220px] max-w-[280px] transition-all duration-200 group bg-white"
      style={{
        borderLeft: `4px solid ${borderColor}`,
        border: `1px solid #e5e7eb`,
        borderLeftWidth: '4px',
        borderLeftColor: borderColor,
        boxShadow,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 group-hover:!opacity-100 !transition-opacity !bg-gray-400 !w-2 !h-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 group-hover:!opacity-100 !transition-opacity !bg-gray-400 !w-2 !h-2 !border-0"
      />

      <div className="px-3 py-2.5">
        {/* Header row: icon + name + model badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <Bot size={13} className="text-gray-400 shrink-0" />
          <div
            className="text-[13px] font-bold truncate flex-1 leading-tight"
            style={{ color: '#1a2a3a' }}
          >
            {agent.name}
          </div>
          {/* Model badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none shrink-0"
            style={{ background: `${mColor}18`, color: mColor, border: `1px solid ${mColor}30` }}
          >
            {modelLabel(agent.model)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-2" />

        {/* Task text */}
        {agent.task && (
          <div className="text-[11px] text-gray-500 line-clamp-2 leading-tight mb-2">
            {agent.task}
          </div>
        )}

        {/* Footer: status + duration */}
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <>
              <span
                className="block w-2 h-2 rounded-full shrink-0"
                style={{ background: '#3b82f6', animation: 'ccPulse 2s infinite' }}
              />
              <span className="text-[10px] text-blue-500 font-medium">running</span>
            </>
          )}
          {isDone && (
            <>
              <CheckCircle2 size={12} className="text-green-500 shrink-0" />
              <span className="text-[10px] text-green-600 font-medium">done</span>
            </>
          )}
          {isFailed && (
            <>
              <XCircle size={12} className="text-red-500 shrink-0" />
              <span className="text-[10px] text-red-500 font-medium">failed</span>
            </>
          )}
          {!isRunning && !isDone && !isFailed && (
            <>
              <span className="block w-2 h-2 rounded-full bg-gray-400 shrink-0" />
              <span className="text-[10px] text-gray-400 font-medium">{agent.status}</span>
            </>
          )}
          <span className="text-gray-300 mx-0.5">•</span>
          <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
            <Clock size={9} />
            {formatDuration(agent.created_at, agent.finished_at)}
          </span>
        </div>
      </div>

      {/* Unread badge */}
      {msgs > 0 && (
        <div className="absolute -top-2 -left-2 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
          {msgs}
        </div>
      )}
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
        style: { stroke: '#d1d5db', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#d1d5db' },
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
              labelStyle: { fill: '#ff6b35', fontSize: 10, fontWeight: 500 },
              labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 4,
              style: { stroke: '#ff6b35', strokeWidth: 1.5, strokeDasharray: '5 3' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#ff6b35' },
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
      <div className="flex-1 flex items-center justify-center" style={{ background: '#f9fafb' }}>
        <div className="text-center">
          <div className="text-4xl mb-4">&#x1f916;</div>
          <div className="text-lg font-medium" style={{ color: '#1a2a3a' }}>No agents running</div>
          <div className="text-sm mt-1 text-gray-500">
            Spawn agents with{' '}
            <code
              className="px-1.5 py-0.5 rounded text-[#ff6b35]"
              style={{ background: 'rgba(255,107,53,0.08)' }}
            >
              oa run
            </code>
          </div>
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
        style={{ background: '#f9fafb' }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#d1d5db', strokeWidth: 1.5 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d1d5db"
          style={{ background: '#f9fafb' }}
        />
        <Controls
          showInteractive={false}
          className="!bg-white !border-gray-200 !rounded-lg [&>button]:!bg-white [&>button]:!border-gray-200 [&>button]:!text-gray-500 [&>button:hover]:!bg-gray-50"
        />
        <MiniMap
          nodeColor={(n) => {
            const agent = (n.data as any)?.agent as Agent | undefined;
            return agent ? statusBorderColor(agent.status) : '#d1d5db';
          }}
          className="!bg-white !border !border-gray-200 !rounded-lg"
          maskColor="rgba(249,250,251,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
