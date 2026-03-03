import { statusColor } from '../../stores/agentStore';

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const color = statusColor(status);
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{ background: color, color: '#0a0a0a' }}
    >
      {status}
    </span>
  );
}
