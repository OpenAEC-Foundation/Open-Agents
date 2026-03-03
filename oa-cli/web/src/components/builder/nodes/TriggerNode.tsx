import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export function TriggerNode({ data }: NodeProps) {
  const triggerType = (data as Record<string, unknown>).triggerType as string || 'manual';

  return (
    <div className="bg-oa-surface border-2 border-emerald-500 rounded-lg px-4 py-3 min-w-[160px] shadow-lg">
      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Trigger</div>
      <div className="text-xs text-oa-text capitalize">{triggerType}</div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-500 !w-2.5 !h-2.5" />
    </div>
  );
}
