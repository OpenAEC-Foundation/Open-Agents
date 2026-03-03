import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';

export function ConditionNode({ data }: NodeProps) {
  const expression = (data as Record<string, unknown>).expression as string || 'condition';

  return (
    <div className="bg-oa-surface border-2 border-amber-500 rounded-lg px-4 py-3 min-w-[160px] shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-2.5 !h-2.5" />
      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Condition</div>
      <div className="text-xs text-oa-text truncate max-w-[140px]">{expression}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        style={{ top: '30%' }}
        className="!bg-status-done !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="no"
        style={{ top: '70%' }}
        className="!bg-status-failed !w-2.5 !h-2.5"
      />
    </div>
  );
}
