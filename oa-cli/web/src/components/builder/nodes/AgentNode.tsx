import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { modelColor, modelLabel } from '../../../stores/agentStore';

interface AgentData {
  label?: string;
  task?: string;
  model?: string;
  [key: string]: unknown;
}

export function AgentNode({ data, selected }: NodeProps) {
  const d = data as AgentData;
  const model = d.model || 'claude/sonnet';
  const task = d.task || 'New agent task';
  const label = d.label || 'Agent';

  return (
    <div
      className="rounded-lg px-4 py-3 min-w-[180px] shadow-lg"
      style={{
        background: '#111111',
        border: `2px solid ${selected ? '#ff8c33' : '#ff6b00'}`,
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5"
        style={{ background: '#ff6b00' }}
      />
      <div className="flex items-center justify-between mb-1">
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: '#ff6b00' }}
        >
          {label}
        </div>
        <span
          className="font-mono text-[9px] px-1 py-px rounded border"
          style={{ borderColor: modelColor(model), color: modelColor(model) }}
        >
          {modelLabel(model)}
        </span>
      </div>
      <div className="text-xs truncate max-w-[160px]" style={{ color: '#e5e5e5' }}>
        {task}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5"
        style={{ background: '#ff6b00' }}
      />
    </div>
  );
}
