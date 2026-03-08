import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface OutputData {
  label?: string;
  outputType?: string;
  [key: string]: unknown;
}

const OUTPUT_TYPES = ['merge', 'file', 'notify', 'webhook'] as const;

export { OUTPUT_TYPES };

export function OutputNode({ data, selected }: NodeProps) {
  const d = data as OutputData;
  const outputType = d.outputType || 'merge';
  const label = d.label || 'Output';

  return (
    <div
      className="rounded-lg px-4 py-3 min-w-[160px] shadow-lg"
      style={{
        background: '#111111',
        border: `2px solid ${selected ? '#a78bfa' : '#8b5cf6'}`,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5"
        style={{ background: '#8b5cf6' }}
      />
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: '#a78bfa' }}
      >
        {label}
      </div>
      <div className="text-xs capitalize" style={{ color: '#e5e5e5' }}>
        {outputType}
      </div>
    </div>
  );
}
