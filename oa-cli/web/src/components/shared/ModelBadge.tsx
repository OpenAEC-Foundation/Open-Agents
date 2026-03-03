import { modelColor, modelLabel } from '../../stores/agentStore';

interface Props {
  model: string;
}

export function ModelBadge({ model }: Props) {
  const color = modelColor(model);
  return (
    <span
      className="font-mono text-[9px] px-1 py-0.5 rounded border"
      style={{ borderColor: color, color }}
    >
      {modelLabel(model)}
    </span>
  );
}
