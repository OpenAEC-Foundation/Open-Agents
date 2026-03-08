import { Cpu, LayersIcon, LayoutDashboard, Library, Settings, Users } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import type { MainTab } from '../../types';

const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={13} /> },
  { id: 'builder', label: 'Agent Builder', icon: <Cpu size={13} /> },
  { id: 'templates', label: 'Templates', icon: <Library size={13} /> },
  { id: 'context', label: 'Context Builder', icon: <LayersIcon size={13} /> },
  { id: 'teams', label: 'Teams', icon: <Users size={13} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={13} /> },
];

export function TabBar() {
  const activeTab = useUIStore((s) => s.activeMainTab);
  const setTab = useUIStore((s) => s.setMainTab);

  return (
    <div className="flex shrink-0 bg-white border-b border-gray-200">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold cursor-pointer transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-[#ff6b35] border-[#ff6b35] bg-orange-50'
              : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
