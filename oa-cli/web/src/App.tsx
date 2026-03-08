import { useEffect, useState } from 'react';
import { useAgentStore } from './stores/agentStore';
import { useUIStore } from './stores/uiStore';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { BuilderTab } from './components/builder/BuilderTab';
import { TemplatesTab } from './components/templates/TemplatesTab';
import { ContextTab } from './components/context/ContextTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { TeamsTab } from './components/teams/TeamsTab';
import Onboarding from './components/Onboarding';

export default function App() {
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('oa_onboarded'));
  const activeMainTab = useUIStore((s) => s.activeMainTab);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 2000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  return (
    <div className="flex h-screen bg-oa-bg text-oa-text font-sans overflow-hidden">
      <style>{`
        @keyframes ccPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ccFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a4a6b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3a6494; }
        textarea:focus, input:focus, select:focus {
          outline: 1px solid #f97316 !important;
          border-color: #f97316 !important;
        }
      `}</style>

      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {activeMainTab === 'dashboard' && <DashboardTab />}
        {activeMainTab === 'builder' && <BuilderTab />}
        {activeMainTab === 'templates' && <TemplatesTab />}
        {activeMainTab === 'context' && <ContextTab />}
        {activeMainTab === 'teams' && <TeamsTab />}
        {activeMainTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
