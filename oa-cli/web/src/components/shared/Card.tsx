import type { ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: Props) {
  return (
    <div className={`bg-oa-surface border border-oa-border rounded-lg ${className}`}>
      {title && (
        <div className="px-3 py-2 border-b border-oa-border-light text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
          {title}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
