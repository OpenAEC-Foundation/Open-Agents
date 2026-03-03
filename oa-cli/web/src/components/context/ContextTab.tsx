import { useState } from 'react';
import { useContextStore } from '../../stores/contextStore';
import { ContextWorkspace } from './ContextWorkspace';

export function ContextTab() {
  const snippets = useContextStore((s) => s.snippets);
  const addItem = useContextStore((s) => s.addItem);
  const customInstructions = useContextStore((s) => s.customInstructions);
  const setInstructions = useContextStore((s) => s.setInstructions);
  const clearAll = useContextStore((s) => s.clearAll);

  const [fileInput, setFileInput] = useState('');

  const handleAddFile = () => {
    if (!fileInput.trim()) return;
    addItem({
      id: `file-${Date.now()}`,
      type: 'file',
      name: fileInput.trim(),
      content: `// Contents of ${fileInput.trim()}\n// (File content would be loaded from workspace)`,
      tokens: Math.floor(Math.random() * 500) + 100,
    });
    setFileInput('');
  };

  const handleAddSnippet = (snippet: typeof snippets[0]) => {
    addItem({
      id: `snippet-${Date.now()}`,
      type: 'snippet',
      name: snippet.name,
      content: snippet.content,
      tokens: Math.ceil(snippet.content.length / 4),
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Sources panel */}
      <div className="w-[300px] min-w-[300px] border-r border-oa-border flex flex-col bg-oa-bg">
        {/* File selector */}
        <div className="p-3 border-b border-oa-border-light">
          <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">
            File Selector
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Enter file path..."
              value={fileInput}
              onChange={(e) => setFileInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFile()}
              className="flex-1 px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs font-mono"
            />
            <button
              onClick={handleAddFile}
              className="px-3 py-1.5 bg-oa-accent text-oa-bg rounded text-xs font-bold cursor-pointer hover:brightness-110"
            >
              Add
            </button>
          </div>
        </div>

        {/* Snippet library */}
        <div className="p-3 border-b border-oa-border-light flex-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">
            Snippet Library
          </div>
          <div className="space-y-1.5">
            {snippets.map((snippet) => (
              <button
                key={snippet.id}
                onClick={() => handleAddSnippet(snippet)}
                className="w-full text-left px-3 py-2 bg-oa-surface border border-oa-border rounded hover:border-neutral-600 cursor-pointer transition-colors"
              >
                <div className="text-xs text-oa-text font-semibold">{snippet.name}</div>
                <div className="text-[10px] text-oa-text-dim mt-0.5 truncate">{snippet.content.slice(0, 60)}...</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom instructions */}
        <div className="p-3 border-t border-oa-border">
          <div className="text-[10px] font-bold text-oa-text-muted uppercase tracking-widest mb-2">
            Custom Instructions
          </div>
          <textarea
            value={customInstructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Type additional instructions..."
            rows={4}
            className="w-full px-2 py-1.5 bg-oa-bg border border-neutral-700 rounded text-oa-text text-xs resize-y leading-relaxed"
          />
          <button
            onClick={clearAll}
            className="w-full mt-2 py-1.5 bg-oa-bg border border-neutral-700 text-oa-text-dim rounded text-xs cursor-pointer hover:text-oa-text"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Right: Context workspace / preview */}
      <ContextWorkspace />
    </div>
  );
}
