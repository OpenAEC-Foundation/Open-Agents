import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./components/AgentNode";
import { Sidebar } from "./components/Sidebar";
import { useCanvasStore } from "./stores/canvasStore";
import type { AgentNodeData } from "@open-agents/shared";

const nodeTypes = { agent: AgentNode };

export function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    getCanvasConfig,
  } = useCanvasStore();

  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/open-agents-preset");
      if (!raw) return;

      const data = JSON.parse(raw) as AgentNodeData;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      addNode(data, {
        x: e.clientX - bounds.left - 120,
        y: e.clientY - bounds.top - 40,
      });
    },
    [addNode],
  );

  const handleExport = useCallback(() => {
    const config = getCanvasConfig();
    setExportedJson(JSON.stringify(config, null, 2));
  }, [getCanvasConfig]);

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
