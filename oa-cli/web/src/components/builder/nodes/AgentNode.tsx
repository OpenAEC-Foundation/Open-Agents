import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { modelColor, modelLabel } from '../../../stores/agentStore';

export function AgentNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const model = (d.model as string) || 'claude/sonnet';
  const task = (d.task as string) || 'Agent task';

  return (
    <div className="bg-oa-surface border-2 border-oa-accent rounded-lg px-4 py-3 min-w-[180px] shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-oa-accent !w-2.5 !h-2.5" />
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-bold text-oa-accent uppercase tracking-widest">Agent</div>
        <span
          className="font-mono text-[9px] px-1 py-px rounded border"
          style={{ borderColor: modelColor(model), color: modelColor(model) }}
        >
          {modelLabel(model)}
        </span>
      </div>
      <div className="text-xs text-oa-text truncate max-w-[160px]">{task}</div>
      <Handle type="source" position={Position.Right} className="!bg-oa-accent !w-2.5 !h-2.5" />
    </div>
  );
}
