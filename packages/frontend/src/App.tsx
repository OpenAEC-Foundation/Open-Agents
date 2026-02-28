import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "./components/AgentNode";
import { Sidebar } from "./components/Sidebar";
import { SkillLevelToggle } from "./components/SkillLevelToggle";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import { ConnectModal } from "./components/ConnectModal";
import { ThemePicker } from "./components/ThemePicker";
import { ChatPanel } from "./components/ChatPanel";
import { OutputPanel } from "./components/OutputPanel";
import { useCanvasStore } from "./stores/canvasStore";
import { useChatStore } from "./stores/chatStore";
import { useExecutionStore } from "./stores/executionStore";
import { useSettingsStore } from "./stores/settingsStore";
import { getTheme, applyTheme } from "./themes/themes";
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

  const themeId = useSettingsStore((s) => s.themeId);

  useEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);

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

  const isRunning = useExecutionStore((s) => s.isRunning);
  const startExecution = useExecutionStore((s) => s.startExecution);

  const handleRun = useCallback(() => {
    const config = getCanvasConfig();
    startExecution(config);
    setExportedJson(null); // close export panel if open
  }, [getCanvasConfig, startExecution]);

  const openChat = useChatStore((s) => s.openChat);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      openChat(node.id);
    },
    [openChat],
  );

  return (
    <div className="w-full h-full flex flex-col font-sans">
      <header className="h-12 bg-surface-raised text-text-primary flex items-center px-4 gap-4 shrink-0 border-b border-border-default">
        <h1 className="text-lg font-semibold">Open-Agents</h1>
        <span className="text-text-tertiary text-sm">Canvas</span>
        <div className="ml-auto flex items-center gap-3">
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
