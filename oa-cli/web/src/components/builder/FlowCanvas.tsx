import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TriggerNode } from './nodes/TriggerNode';
import { AgentNode } from './nodes/AgentNode';
import { ConditionNode } from './nodes/ConditionNode';
import { OutputNode } from './nodes/OutputNode';

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  condition: ConditionNode,
  output: OutputNode,
};

interface Props {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodeSelect?: (node: Node | null) => void;
  onNodesUpdate?: (nodes: Node[]) => void;
  onEdgesUpdate?: (edges: Edge[]) => void;
  onDeleteSelected?: () => void;
}

export function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodeSelect,
  onNodesUpdate,
  onEdgesUpdate,
}: Props) {
  const [nodes, setNodes, onNodesChangeHandler] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeHandler] = useEdgesState(initialEdges);

  useEffect(() => { onNodesUpdate?.(nodes); }, [nodes, onNodesUpdate]);
  useEffect(() => { onEdgesUpdate?.(edges); }, [edges, onEdgesUpdate]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#ff6b00', strokeWidth: 2 } }, eds)
      );
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => { onNodeSelect?.(node); },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => { onNodeSelect?.(null); }, [onNodeSelect]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement).tagName
      )) {
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
        onNodeSelect?.(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setNodes, setEdges, onNodeSelect]);

  return (
    <div className="flex-1 h-full" style={{ background: '#0a0a0a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: '#0a0a0a' }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#ff6b00', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#222222" />
        <Controls
          className="!rounded-lg"
          style={{ background: '#111111', border: '1px solid #222222' }}
        />
      </ReactFlow>
    </div>
  );
}

export { useNodesState, useEdgesState };
export type { Node, Edge };
