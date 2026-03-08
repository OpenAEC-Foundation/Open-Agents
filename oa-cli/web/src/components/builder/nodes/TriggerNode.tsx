import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

interface TriggerData {
  label?: string;
  triggerType?: string;
  [key: string]: unknown;
}

const TRIGGER_TYPES = ['manual', 'schedule', 'webhook', 'event'] as const;

export { TRIGGER_TYPES };

export function TriggerNode({ data, selected }: NodeProps) {
  const d = data as TriggerData;
  const triggerType = d.triggerType || 'manual';
  const label = d.label || 'Trigger';

  return (
    <div
      className="rounded-lg px-4 py-3 min-w-[160px] shadow-lg"
      style={{
        background: '#111111',
        border: `2px solid ${selected ? '#34d399' : '#10b981'}`,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-1"
        style={{ color: '#34d399' }}
      >
        {label}
      </div>
      <div className="text-xs capitalize" style={{ color: '#e5e5e5' }}>
        {triggerType}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5"
        style={{ background: '#10b981' }}
      />
    </div>
  );
}
