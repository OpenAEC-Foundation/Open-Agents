import { useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTemplateStore } from '../../stores/templateStore';
import { useUIStore } from '../../stores/uiStore';
import { useAgentStore } from '../../stores/agentStore';
import { TemplateCard } from './TemplateCard';
import type { Template } from '../../types';

export function TemplatesTab() {
  const loadTemplates = useTemplateStore((s) => s.loadTemplates);
  const searchQuery = useTemplateStore((s) => s.searchQuery);
  const setSearchQuery = useTemplateStore((s) => s.setSearchQuery);
  const selectedCategory = useTemplateStore((s) => s.selectedCategory);
  const setCategory = useTemplateStore((s) => s.setCategory);
  const duplicateTemplate = useTemplateStore((s) => s.duplicateTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);
  const filtered = useTemplateStore((s) => s.getFiltered)();
  const allTemplates = useTemplateStore((s) => s.templates);
  const setMainTab = useUIStore((s) => s.setMainTab);
  const setPrefilledTask = useUIStore((s) => s.setPrefilledTask);
  const spawnAgent = useAgentStore((s) => s.spawnAgent);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const categories = ['all', ...Array.from(new Set(allTemplates.map((t) => t.category).filter(Boolean))).sort()];

  const getTaskFromTemplate = (t: Template) =>
    t.systemPrompt || t.nodes.find((n) => n.type === 'agent')?.data.task as string || t.description || '';

  const getModelFromTemplate = (t: Template) =>
    t.modelHint || t.nodes.find((n) => n.type === 'agent')?.data.model as string || 'claude/sonnet';

  const handleUse = (template: Template) => {
    setPrefilledTask(getTaskFromTemplate(template), getModelFromTemplate(template));
    setMainTab('dashboard');
  };

  const handleSpawn = async (template: Template) => {
    await spawnAgent({ task: getTaskFromTemplate(template), model: getModelFromTemplate(template) });
    setMainTab('dashboard');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 border-b border-oa-border bg-oa-surface shrink-0 space-y-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, description or prompt…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-oa-bg border border-neutral-700 rounded-lg text-oa-text text-xs focus:outline-none focus:border-cyan-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
              }`}
            >
              {cat === 'all' ? `All (${allTemplates.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-500">
            <Search size={24} className="opacity-40" />
            <span className="text-sm">No templates found for "{searchQuery || selectedCategory}"</span>
            <button onClick={() => { setSearchQuery(''); setCategory('all'); }} className="text-xs text-cyan-500 hover:text-cyan-400">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="text-[11px] text-neutral-600 mb-3">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={handleUse}
                  onSpawn={handleSpawn}
                  onDuplicate={duplicateTemplate}
                  onDelete={deleteTemplate}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
