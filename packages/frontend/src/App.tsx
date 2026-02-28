import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./components/AgentNode";
import { Sidebar } from "./components/Sidebar";
import type { CanvasConfig, AgentNodeData } from "@open-agents/shared";

// React Flow v12 requires Record<string, unknown> for node data.
// We use Node (unparameterized) and cast data in components via `as unknown as AgentNodeData`.
const nodeTypes = { agent: AgentNode };

const initialNodes: Node[] = [
  {
    id: "agent-1",
    type: "agent",
    position: { x: 100, y: 100 },
    data: {
      name: "Analyst",
      model: "anthropic/claude-sonnet-4-6",
      systemPrompt: "Analyse the codebase and identify key patterns.",
      tools: ["Read", "Glob", "Grep"],
    },
  },
  {
    id: "agent-2",
    type: "agent",
    position: { x: 500, y: 100 },
    data: {
      name: "Reporter",
      model: "anthropic/claude-haiku-4-5",
      systemPrompt: "Write a concise summary based on the analysis.",
      tools: ["Read", "Write"],
    },
  },
];

const initialEdges: Edge[] = [];

export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const nodeIdCounter = useRef(3); // start after agent-1 and agent-2
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/open-agents-preset");
      if (!raw) return;

      const data = JSON.parse(raw) as Record<string, unknown>;
      const id = `agent-${nodeIdCounter.current++}`;

      // Get the bounding rect of the ReactFlow wrapper to calculate position
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const newNode: Node = {
        id,
        type: "agent",
        position: {
          x: e.clientX - bounds.left - 120,
          y: e.clientY - bounds.top - 40,
        },
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const handleExport = useCallback(() => {
    const config: CanvasConfig = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.type ?? "agent") as CanvasConfig["nodes"][number]["type"],
        position: n.position,
        data: n.data as unknown as AgentNodeData,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };
    setExportedJson(JSON.stringify(config, null, 2));
  }, [nodes, edges]);

  return (
    <div className="w-full h-full flex flex-col">
      <header className="h-12 bg-zinc-900 text-white flex items-center px-4 gap-4 shrink-0 border-b border-zinc-700">
        <h1 className="text-lg font-semibold">Open-Agents</h1>
        <span className="text-zinc-400 text-sm">Canvas</span>
      </header>

      <div className="flex-1 flex min-h-0">
        <Sidebar />

        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Export JSON
              </button>
            </Panel>
          </ReactFlow>

          {exportedJson && (
            <div className="absolute bottom-0 left-0 right-0 max-h-64 bg-zinc-900/95 border-t border-zinc-700 overflow-auto">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
                <span className="text-zinc-300 text-sm font-medium">
                  Canvas Export
                </span>
                <button
                  onClick={() => setExportedJson(null)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>
              <pre className="p-4 text-xs text-green-400 font-mono">
                {exportedJson}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
