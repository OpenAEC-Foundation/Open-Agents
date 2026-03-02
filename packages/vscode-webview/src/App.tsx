import { useCallback, useEffect, useRef, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "@frontend/components/AgentNode";
import { Sidebar } from "@frontend/components/Sidebar";
import { ChatPanel } from "@frontend/components/ChatPanel";
import { OutputPanel } from "@frontend/components/OutputPanel";
import { ConnectModal } from "@frontend/components/ConnectModal";
import { ConnectionIndicator } from "@frontend/components/ConnectionIndicator";
import { ThemePicker } from "@frontend/components/ThemePicker";
import { SkillLevelToggle } from "@frontend/components/SkillLevelToggle";
import { useAppStore } from "@frontend/stores/appStore";
import { getTheme, applyTheme } from "@frontend/themes/themes";
import { useVsCodeBridge } from "./hooks/useVsCodeBridge";
import type { AgentNodeData } from "@open-agents/shared";

const nodeTypes = { agent: AgentNode };

export function App() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect = useAppStore((s) => s.onConnect);
  const addNode = useAppStore((s) => s.addNode);
  const setCanvas = useAppStore((s) => s.setCanvas);
  const getCanvasConfig = useAppStore((s) => s.getCanvasConfig);

  const themeId = useAppStore((s) => s.themeId);

  useEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);

  // VS Code bridge: settings, state persistence, MCP sync
  useVsCodeBridge(nodes, edges, setCanvas);

  const exportedJson = useAppStore((s) => s.exportedJson);
  const setExportedJson = useAppStore((s) => s.setExportedJson);
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
  }, [getCanvasConfig, setExportedJson]);

  const isRunning = useAppStore((s) => s.isRunning);
  const startExecution = useAppStore((s) => s.startExecution);

  const handleRun = useCallback(() => {
    const config = getCanvasConfig();
    startExecution(config);
    setExportedJson(null);
  }, [getCanvasConfig, startExecution, setExportedJson]);

  const openChat = useAppStore((s) => s.openChat);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      openChat(node.id);
    },
    [openChat],
  );

  // Undo/Redo keyboard shortcuts
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return (
    <div className="w-full h-full flex flex-col font-sans">
      <header className="h-10 bg-surface-raised text-text-primary flex items-center px-3 gap-3 shrink-0 border-b border-border-default">
        <h1 className="text-sm font-semibold">Open-Agents</h1>
        <div className="ml-auto flex items-center gap-2">
          <ConnectionIndicator />
          <ThemePicker />
          <SkillLevelToggle />
        </div>
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
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right">
              <div className="flex gap-2">
                <button
                  onClick={handleRun}
                  disabled={isRunning || nodes.length === 0}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? "Running..." : "Run"}
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 bg-accent-primary text-text-primary rounded text-sm hover:bg-accent-primary-hover"
                >
                  Export JSON
                </button>
              </div>
            </Panel>
          </ReactFlow>

          {exportedJson && (
            <div className="absolute bottom-0 left-0 right-0 max-h-64 bg-surface-base/95 border-t border-border-default overflow-auto z-10">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
                <span className="text-text-secondary text-sm font-medium">
                  Canvas Export
                </span>
                <button
                  onClick={() => setExportedJson(null)}
                  className="text-text-tertiary hover:text-text-primary text-sm"
                >
                  Close
                </button>
              </div>
              <pre className="p-4 text-xs text-accent-code font-mono">
                {exportedJson}
              </pre>
            </div>
          )}

          <OutputPanel />
        </div>

        <ChatPanel />
      </div>

      <ConnectModal />
    </div>
  );
}
