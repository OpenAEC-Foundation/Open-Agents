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
    <div
      className="flex shrink-0"
      style={{ background: '#1a1a1a', borderBottom: '1px solid #2d2d2d' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setTab(tab.id)}
          className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold cursor-pointer transition-colors border-b-2"
          style={
            activeTab === tab.id
              ? {
                  color: '#ff6b00',
                  borderBottomColor: '#ff6b00',
                  background: 'rgba(255, 107, 0, 0.10)',
                }
              : {
                  color: '#cccccc',
                  borderBottomColor: 'transparent',
                }
          }
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.background = '#2d2d2d';
              (e.currentTarget as HTMLButtonElement).style.color = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#cccccc';
            }
          }}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
