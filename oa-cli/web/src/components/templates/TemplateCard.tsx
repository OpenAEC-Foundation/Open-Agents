import type { Template } from '../../types';

interface Props {
  template: Template;
  onUse: (template: Template) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({ template, onUse, onDuplicate, onDelete }: Props) {
  return (
    <div className="bg-oa-surface border border-oa-border rounded-lg p-4 flex flex-col hover:border-neutral-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-bold text-oa-text">{template.name}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-oa-bg border border-oa-border text-oa-text-dim">
          {template.category}
        </span>
      </div>
      <p className="text-xs text-oa-text-muted flex-1 mb-3 leading-relaxed">
        {template.description}
      </p>
      <div className="text-[10px] text-oa-text-dim mb-3 font-mono">
        Nodes: {template.nodes.length} &middot; Edges: {template.edges.length}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => onUse(template)}
          className="flex-1 py-1.5 bg-oa-accent text-oa-bg rounded text-xs font-bold cursor-pointer hover:brightness-110"
        >
          Use
        </button>
        <button
          onClick={() => onDuplicate(template.id)}
          className="px-3 py-1.5 bg-oa-bg border border-oa-border text-oa-text-muted rounded text-xs cursor-pointer hover:text-oa-text"
        >
          Copy
        </button>
        <button
          onClick={() => onDelete(template.id)}
          className="px-3 py-1.5 bg-oa-bg border border-red-900 text-red-400 rounded text-xs cursor-pointer hover:bg-red-950"
        >
          Del
        </button>
      </div>
    </div>
  );
}
