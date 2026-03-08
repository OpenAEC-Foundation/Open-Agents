import { Cpu, LayersIcon, LayoutDashboard, Library, Settings } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import type { MainTab } from '../../types';

const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={13} /> },
  { id: 'builder', label: 'Agent Builder', icon: <Cpu size={13} /> },
  { id: 'templates', label: 'Templates', icon: <Library size={13} /> },
  { id: 'context', label: 'Context Builder', icon: <LayersIcon size={13} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
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
          className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold cursor-pointer transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-oa-accent border-oa-accent bg-oa-accent/10'
              : 'text-oa-text-muted border-transparent hover:text-neutral-300 hover:bg-neutral-800/40'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
