import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export function OutputNode({ data }: NodeProps) {
  const outputType = (data as Record<string, unknown>).outputType as string || 'merge';

  return (
    <div className="bg-oa-surface border-2 border-violet-500 rounded-lg px-4 py-3 min-w-[160px] shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-2.5 !h-2.5" />
      <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Output</div>
      <div className="text-xs text-oa-text capitalize">{outputType}</div>
    </div>
  );
}
