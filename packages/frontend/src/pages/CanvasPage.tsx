import { useCallback, useMemo, useRef, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type NodeMouseHandler,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode } from "../components/AgentNode";
import { DispatcherNode } from "../components/DispatcherNode";
import { AggregatorNode } from "../components/AggregatorNode";
import { Sidebar } from "../components/Sidebar";
import { ChatPanel } from "../components/ChatPanel";
import { OutputPanel } from "../components/OutputPanel";
import { ExecutionToolbar } from "../components/ExecutionToolbar";
import { ErrorDecisionDialog } from "../components/ErrorDecisionDialog";
import { GenerateBar } from "../components/GenerateBar";
import { AssistantSidebar } from "../components/AssistantSidebar";
import { useAppStore } from "../stores/appStore";
import type { CanvasNodeData, NodeType } from "@open-agents/shared";

const nodeTypes = { agent: AgentNode, dispatcher: DispatcherNode, aggregator: AggregatorNode };

export function CanvasPage() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const onNodesChange = useAppStore((s) => s.onNodesChange);
  const onEdgesChange = useAppStore((s) => s.onEdgesChange);
  const onConnect = useAppStore((s) => s.onConnect);
  const addNode = useAppStore((s) => s.addNode);
  const getCanvasConfig = useAppStore((s) => s.getCanvasConfig);

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

      const parsed = JSON.parse(raw) as { _nodeType?: NodeType } & CanvasNodeData;
      const nodeType: NodeType = parsed._nodeType ?? "agent";
      // Strip the meta field before passing to store
      const { _nodeType, ...data } = parsed;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      addNode(data as CanvasNodeData, {
        x: e.clientX - bounds.left - 120,
        y: e.clientY - bounds.top - 40,
      }, nodeType);
    },
    [addNode],
  );

  const handleExport = useCallback(() => {
    const config = getCanvasConfig();
    setExportedJson(JSON.stringify(config, null, 2));
  }, [getCanvasConfig, setExportedJson]);

  const nodeStatuses = useAppStore((s) => s.nodeStatuses);

  // Derive edge colors from node execution status
  const displayEdges: Edge[] = useMemo(() => {
    return edges.map((edge) => {
      const sourceStatus = nodeStatuses[edge.source];
      const targetStatus = nodeStatuses[edge.target];

      let strokeColor = "#404040"; // idle grey
      let animated = false;

      if (sourceStatus === "error" || targetStatus === "error") {
        strokeColor = "#ef4444"; // red
      } else if (
        sourceStatus === "completed" &&
        targetStatus === "completed"
      ) {
        strokeColor = "#22c55e"; // green
      } else if (
        sourceStatus === "completed" &&
        targetStatus === "running"
      ) {
        strokeColor = "#3b82f6"; // blue
        animated = true;
      } else if (sourceStatus === "running") {
        strokeColor = "#3b82f6";
      }

      return {
        ...edge,
        animated,
        style: { ...edge.style, stroke: strokeColor, strokeWidth: 2 },
      };
    });
  }, [edges, nodeStatuses]);

  const openChat = useAppStore((s) => s.openChat);

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      openChat(node.id);
    },
    [openChat],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* GenerateBar — prominent NL input above canvas (Sprint 6b) */}
      <div className="px-4 py-2 bg-surface-base border-b border-border-default shrink-0">
        <GenerateBar />
      </div>

      <div className="flex-1 flex min-h-0">
      <Sidebar />

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
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
              <ExecutionToolbar />
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
        <ErrorDecisionDialog />
      </div>

      <ChatPanel />
      <AssistantSidebar />
      </div>
    </div>
  );
}
