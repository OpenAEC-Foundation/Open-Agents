import { useUIStore } from '../../stores/uiStore';
import type { MainTab } from '../../types';

const TABS: { id: MainTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'builder', label: 'Agent Builder' },
  { id: 'templates', label: 'Templates' },
  { id: 'context', label: 'Context Builder' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar() {
  const activeTab = useUIStore((s) => s.activeMainTab);
  const setTab = useUIStore((s) => s.setMainTab);

  return (
    <div className="flex border-b border-oa-border bg-oa-surface shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`px-5 py-2.5 text-xs font-semibold cursor-pointer transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-oa-accent border-oa-accent'
              : 'text-oa-text-muted border-transparent hover:text-neutral-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
