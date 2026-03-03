const NODE_TYPES = [
  { type: 'trigger', label: 'Trigger', color: 'border-emerald-500 text-emerald-400', desc: 'Pipeline start point' },
  { type: 'agent', label: 'Agent', color: 'border-oa-accent text-oa-accent', desc: 'Agent execution step' },
  { type: 'condition', label: 'Condition', color: 'border-amber-500 text-amber-400', desc: 'Branch on condition' },
  { type: 'output', label: 'Output', color: 'border-violet-500 text-violet-400', desc: 'Pipeline output' },
];

interface Props {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: Props) {
  return (
    <div className="w-[180px] min-w-[180px] border-r border-oa-border flex flex-col bg-oa-bg">
      <div className="px-3 py-2 border-b border-oa-border-light text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
        Node Palette
      </div>
      <div className="p-2 space-y-2">
        {NODE_TYPES.map((node) => (
          <button
            key={node.type}
            onClick={() => onAddNode(node.type)}
            className={`w-full text-left px-3 py-2.5 bg-oa-surface border-2 ${node.color} rounded-lg cursor-pointer hover:brightness-125 transition-all`}
          >
            <div className="text-xs font-bold">{node.label}</div>
            <div className="text-[10px] text-oa-text-dim mt-0.5">{node.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
