import { XtermTerminal } from '../dashboard/XtermTerminal';

interface Props {
  content: string;
}

export function Terminal({ content }: Props) {
  return (
    <div className="absolute inset-3 overflow-hidden rounded-md" style={{ background: '#0a0a0a' }}>
      <XtermTerminal output={content} agentName="" isRunning={false} mode="readonly" />
    </div>
  );
}
