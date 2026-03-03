import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FlowCanvas } from './FlowCanvas';
import { NodePalette } from './NodePalette';
import type { Node, Edge } from '@xyflow/react';

const DEFAULT_NODES: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 100, y: 200 },
    data: { triggerType: 'manual' },
  },
];

const DEFAULT_EDGES: Edge[] = [];

export function BuilderTab() {
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [edges] = useState<Edge[]>(DEFAULT_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeCounter, setNodeCounter] = useState(2);

  const handleAddNode = useCallback(
    (type: string) => {
      const newId = `${type}-${nodeCounter}`;
      const defaultData: Record<string, unknown> = {};

      switch (type) {
        case 'trigger':
          defaultData.triggerType = 'manual';
          break;
        case 'agent':
          defaultData.model = 'claude/sonnet';
          defaultData.task = 'New agent task';
          break;
        case 'condition':
          defaultData.conditionType = 'status';
          defaultData.expression = 'status === "done"';
          break;
        case 'output':
          defaultData.outputType = 'merge';
          break;
      }

      const newNode: Node = {
        id: newId,
        type,
        position: { x: 250 + Math.random() * 200, y: 100 + Math.random() * 300 },
        data: defaultData,
      };

      setNodes((prev) => [...prev, newNode]);
      setNodeCounter((c) => c + 1);
    },
    [nodeCounter]
  );

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Node palette */}
        <NodePalette onAddNode={handleAddNode} />

        {/* Center: React Flow canvas */}
        <FlowCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onNodeSelect={handleNodeSelect}
        />

        {/* Right: Properties panel */}
        <div className="w-[250px] min-w-[250px] border-l border-oa-border flex flex-col bg-oa-bg">
          <div className="px-3 py-2 border-b border-oa-border-light text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
            Properties
          </div>
          {selectedNode ? (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Type</label>
                <div className="text-xs text-oa-text capitalize font-semibold">{selectedNode.type}</div>
              </div>
              <div>
                <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">ID</label>
                <div className="text-xs text-oa-text font-mono">{selectedNode.id}</div>
              </div>

              {selectedNode.type === 'agent' && (
                <>
                  <div>
                    <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Model</label>
                    <select className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs font-mono">
                      <option value="claude/opus">claude/opus</option>
                      <option value="claude/sonnet">claude/sonnet</option>
                      <option value="claude/haiku">claude/haiku</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Task</label>
                    <textarea
                      className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs resize-y"
                      rows={3}
                      defaultValue={(selectedNode.data as Record<string, unknown>).task as string || ''}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'trigger' && (
                <div>
                  <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Trigger Type</label>
                  <select className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs">
                    <option value="manual">Manual</option>
                    <option value="schedule">Schedule</option>
                    <option value="webhook">Webhook</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Expression</label>
                  <input
                    className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs font-mono"
                    defaultValue={(selectedNode.data as Record<string, unknown>).expression as string || ''}
                  />
                </div>
              )}

              {selectedNode.type === 'output' && (
                <div>
                  <label className="text-[10px] text-oa-text-dim uppercase tracking-widest block mb-1">Output Type</label>
                  <select className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs">
                    <option value="merge">Merge</option>
                    <option value="file">File</option>
                    <option value="notify">Notify</option>
                    <option value="webhook">Webhook</option>
                  </select>
                </div>
              )}

              <button className="w-full py-1.5 bg-red-900 text-red-300 border border-red-800 rounded text-xs cursor-pointer hover:bg-red-800 mt-4">
                Delete Node
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-oa-text-dim text-xs">
              Select a node to edit properties
            </div>
          )}

          {/* Action buttons */}
          <div className="p-3 border-t border-oa-border space-y-2">
            <button className="w-full py-2 bg-oa-accent text-oa-bg rounded text-xs font-bold cursor-pointer hover:brightness-110">
              Save Pipeline
            </button>
            <button className="w-full py-2 bg-oa-surface border border-oa-border text-oa-text-muted rounded text-xs cursor-pointer hover:text-oa-text">
              Load Template
            </button>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
