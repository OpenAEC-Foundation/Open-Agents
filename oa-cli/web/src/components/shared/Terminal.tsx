import { useEffect, useRef } from 'react';

interface Props {
  content: string;
}

export function Terminal({ content }: Props) {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [content]);

  return (
    <pre
      ref={ref}
      className="absolute inset-3 p-3 bg-neutral-900 border border-oa-border rounded-md font-mono text-xs leading-relaxed text-neutral-300 overflow-auto whitespace-pre-wrap break-words"
    >
      {content || 'Waiting for output...'}
    </pre>
  );
}
