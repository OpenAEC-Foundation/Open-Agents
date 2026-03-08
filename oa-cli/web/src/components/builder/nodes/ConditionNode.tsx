import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface ConditionData {
  label?: string;
  expression?: string;
  [key: string]: unknown;
}

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as ConditionData;
  const expression = d.expression || 'status === "done"';
  const label = d.label || 'Condition';

  return (
    <div
      className="rounded-lg px-4 py-3 min-w-[160px] shadow-lg"
      style={{
        background: '#111111',
        border: `2px solid ${selected ? '#fbbf24' : '#f59e0b'}`,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5"
        style={{ background: '#f59e0b' }}
      />
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: '#fbbf24' }}
      >
        {label}
      </div>
      <div className="text-xs truncate max-w-[140px]" style={{ color: '#e5e5e5' }}>
        {expression}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        style={{ top: '30%', background: '#4ade80' }}
        className="!w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        style={{ top: '70%', background: '#f87171' }}
        className="!w-2.5 !h-2.5"
      />
    </div>
  );
}
