import { useContextStore } from '../../stores/contextStore';

export function ContextWorkspace() {
  const items = useContextStore((s) => s.items);
  const customInstructions = useContextStore((s) => s.customInstructions);
  const totalTokens = useContextStore((s) => s.getTotalTokens)();
  const exportContext = useContextStore((s) => s.exportContext);
  const removeItem = useContextStore((s) => s.removeItem);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-oa-border bg-oa-surface shrink-0">
        <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
          Context Preview
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-oa-text-dim font-mono">~{totalTokens.toLocaleString()} tokens</span>
          <button
            onClick={() => navigator.clipboard.writeText(exportContext())}
            className="px-3 py-1 bg-oa-accent text-oa-bg rounded text-xs font-bold cursor-pointer hover:brightness-110"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 && !customInstructions ? (
          <div className="flex items-center justify-center h-full text-oa-text-dim text-sm">
            Add files, snippets, or instructions to build context
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border border-oa-border rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-oa-surface border-b border-oa-border-light">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-oa-bg text-oa-text-dim uppercase font-bold">
                      {item.type}
                    </span>
                    <span className="text-xs text-oa-accent font-mono">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-oa-text-dim font-mono">~{item.tokens} tokens</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 text-xs cursor-pointer hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <pre className="p-3 text-xs font-mono text-neutral-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                  {item.content.length > 500 ? item.content.slice(0, 500) + '\n...' : item.content}
                </pre>
              </div>
            ))}

            {customInstructions && (
              <div className="border border-oa-border rounded-md overflow-hidden">
                <div className="px-3 py-2 bg-oa-surface border-b border-oa-border-light">
                  <span className="text-xs text-oa-text font-semibold">Custom Instructions</span>
                </div>
                <div className="p-3 text-xs text-neutral-300 whitespace-pre-wrap">{customInstructions}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
