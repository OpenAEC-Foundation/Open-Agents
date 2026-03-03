interface Props {
  icon?: string;
  message: string;
}

export function EmptyState({ icon = '\u25CE', message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-oa-text-dim gap-3">
      <span className="text-5xl opacity-50">{icon}</span>
      <span className="text-sm text-oa-text-muted">{message}</span>
    </div>
  );
}
