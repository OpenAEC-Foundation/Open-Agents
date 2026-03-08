import { useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FlowCanvas } from './FlowCanvas';
import { NodePalette } from './NodePalette';
import type { Node, Edge } from '@xyflow/react';
import { TRIGGER_TYPES } from './nodes/TriggerNode';
import { OUTPUT_TYPES } from './nodes/OutputNode';

const MODELS = ['claude/opus', 'claude/sonnet', 'claude/haiku'] as const;

const DEFAULT_NODES: Node[] = [
  { id: 'trigger-1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
];

export function BuilderTab() {
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [commands, setCommands] = useState<string | null>(null);
  const counterRef = useRef(2);
  const nodesRef = useRef<Node[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);

  const handleAddNode = useCallback((type: string) => {
    const id = `${type}-${counterRef.current++}`;
    const defaults: Record<string, Record<string, unknown>> = {
      trigger: { triggerType: 'manual' },
      agent: { model: 'claude/sonnet', task: 'New agent task', label: 'Agent' },
      condition: { expression: 'status === "done"' },
      output: { outputType: 'merge' },
    };
    const node: Node = {
      id, type, data: defaults[type] || {},
      position: { x: 250 + Math.random() * 200, y: 100 + Math.random() * 300 },
    };
    setNodes((prev) => [...prev, node]);
  }, []);

  const handleNodeSelect = useCallback((node: Node | null) => { setSelectedNode(node); }, []);

  const updateNodeData = useCallback((key: string, value: string) => {
    if (!selectedNode) return;
    setNodes((prev) => prev.map((n) =>
      n.id === selectedNode.id ? { ...n, data: { ...n.data, [key]: value } } : n
    ));
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
  }, [selectedNode]);

  const deleteNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode]);

  const generateCommands = useCallback(() => {
    const agentNodes = nodesRef.current
      .filter((n) => n.type === 'agent')
      .sort((a, b) => a.position.x - b.position.x);
    if (!agentNodes.length) { setCommands('# No agent nodes in pipeline'); return; }
    const cmds = agentNodes.map((n) => {
      const d = n.data as Record<string, unknown>;
      const model = (d.model as string) || 'claude/sonnet';
      const task = (d.task as string) || 'task';
      const name = (d.label as string) || n.id;
      return `oa run "${task}" --name ${name.replace(/\s+/g, '-').toLowerCase()} --model ${model} --direct`;
    });
    setCommands(cmds.join('\n'));
  }, []);

  const d = selectedNode?.data as Record<string, unknown> | undefined;
  const st = { font: 'Montserrat, sans-serif', bg: '#0a0a0a', surface: '#111111', border: '#222222', accent: '#ff6b00' };
  const inputCls = 'w-full px-2 py-1.5 rounded text-xs';

  return (
    <ReactFlowProvider>
      <div className="flex flex-1 overflow-hidden" style={{ fontFamily: st.font }}>
        <NodePalette onAddNode={handleAddNode} />
        <FlowCanvas
          initialNodes={nodes} initialEdges={edges}
          onNodeSelect={handleNodeSelect}
          onNodesUpdate={(n) => { nodesRef.current = n; }}
          onEdgesUpdate={(e) => { edgesRef.current = e; }}
        />
        {/* Properties Panel */}
        <div className="flex flex-col" style={{ width: 280, minWidth: 280, background: st.bg, borderLeft: `1px solid ${st.border}` }}>
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#888', borderBottom: `1px solid ${st.border}` }}>
            Properties
          </div>
          {selectedNode ? (
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              <Field label="Type"><div className="text-xs font-semibold capitalize" style={{ color: '#e5e5e5' }}>{selectedNode.type}</div></Field>
              <Field label="ID"><div className="text-xs font-mono" style={{ color: '#e5e5e5' }}>{selectedNode.id}</div></Field>
              {selectedNode.type === 'agent' && <>
                <Field label="Name"><input className={inputCls} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.label as string) || ''} onChange={(e) => updateNodeData('label', e.target.value)} /></Field>
                <Field label="Model"><select className={inputCls} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.model as string) || 'claude/sonnet'} onChange={(e) => updateNodeData('model', e.target.value)}>{MODELS.map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
                <Field label="Task"><textarea className={inputCls + ' resize-y'} rows={3} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.task as string) || ''} onChange={(e) => updateNodeData('task', e.target.value)} /></Field>
              </>}
              {selectedNode.type === 'trigger' && <Field label="Trigger Type"><select className={inputCls} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.triggerType as string) || 'manual'} onChange={(e) => updateNodeData('triggerType', e.target.value)}>{TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>}
              {selectedNode.type === 'condition' && <Field label="Expression"><input className={inputCls + ' font-mono'} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.expression as string) || ''} onChange={(e) => updateNodeData('expression', e.target.value)} /></Field>}
              {selectedNode.type === 'output' && <Field label="Output Type"><select className={inputCls} style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }} value={(d?.outputType as string) || 'merge'} onChange={(e) => updateNodeData('outputType', e.target.value)}>{OUTPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>}
              <button onClick={deleteNode} className="w-full py-1.5 rounded text-xs cursor-pointer mt-4" style={{ background: '#1a0000', border: '1px solid #7f1d1d', color: '#f87171' }}>Delete Node</button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: '#555' }}>Select a node to edit</div>
          )}
          <div className="p-3 space-y-2" style={{ borderTop: `1px solid ${st.border}` }}>
            <button onClick={generateCommands} className="w-full py-2 rounded text-xs font-bold cursor-pointer" style={{ background: st.accent, color: '#000' }}>Run Pipeline</button>
            {commands && <pre className="text-[10px] p-2 rounded overflow-x-auto whitespace-pre-wrap" style={{ background: st.surface, border: `1px solid ${st.border}`, color: '#e5e5e5' }}>{commands}</pre>}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: '#666' }}>{label}</label>{children}</div>;
}
