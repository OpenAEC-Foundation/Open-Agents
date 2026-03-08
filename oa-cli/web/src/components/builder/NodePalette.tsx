const NODE_TYPES = [
  { type: 'trigger', emoji: '⚡', label: 'Trigger', color: '#10b981', desc: 'Pipeline start point' },
  { type: 'agent', emoji: '🤖', label: 'Agent', color: '#ff6b00', desc: 'Agent execution step' },
  { type: 'condition', emoji: '🔀', label: 'Condition', color: '#f59e0b', desc: 'Branch on condition' },
  { type: 'output', emoji: '📤', label: 'Output', color: '#8b5cf6', desc: 'Pipeline output' },
] as const;

interface Props {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: Props) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 200, minWidth: 200,
        background: '#0a0a0a',
        borderRight: '1px solid #222222',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <div
        className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: '#888', borderBottom: '1px solid #222222' }}
      >
        Node Palette
      </div>
      <div className="p-3 space-y-3">
        {NODE_TYPES.map((node) => (
          <button
            key={node.type}
            onClick={() => onAddNode(node.type)}
            className="w-full text-left px-3 py-3 rounded-lg cursor-pointer transition-all hover:brightness-125"
            style={{
              background: '#111111',
              border: `2px solid ${node.color}`,
            }}
          >
            <div className="text-xl mb-1">{node.emoji}</div>
            <div className="text-sm font-bold" style={{ color: node.color }}>
              {node.label}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: '#777' }}>
              {node.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
