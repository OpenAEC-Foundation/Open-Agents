import { useEffect } from 'react';
import { useTemplateStore } from '../../stores/templateStore';
import { useUIStore } from '../../stores/uiStore';
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
  const setMainTab = useUIStore((s) => s.setMainTab);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const categories = ['all', 'Quality', 'Development', 'Documentation', 'Security'];

  const handleUse = (_template: Template) => {
    // Navigate to builder tab and load template
    setMainTab('builder');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search & filter bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-oa-border bg-oa-surface shrink-0">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
        <button className="px-4 py-2 bg-oa-accent text-oa-bg rounded-md text-xs font-bold cursor-pointer hover:brightness-110">
          + New Template
        </button>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-oa-text-dim text-sm">
            No templates found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={handleUse}
                onDuplicate={duplicateTemplate}
                onDelete={deleteTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
