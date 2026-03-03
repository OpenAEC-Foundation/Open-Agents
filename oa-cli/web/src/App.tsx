import { useEffect } from 'react';
import { useAgentStore } from './stores/agentStore';
import { useUIStore } from './stores/uiStore';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { BuilderTab } from './components/builder/BuilderTab';
import { TemplatesTab } from './components/templates/TemplatesTab';
import { ContextTab } from './components/context/ContextTab';
import { SettingsTab } from './components/settings/SettingsTab';

export default function App() {
  const activeMainTab = useUIStore((s) => s.activeMainTab);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);

  // Poll agents list
  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 2000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  return (
    <div className="flex flex-col h-screen bg-oa-bg text-oa-text font-sans">
      {/* Global animations */}
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
        ::-webkit-scrollbar-thumb { background: #555d6b; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #7a8494; }
        textarea:focus, input:focus, select:focus {
          outline: 1px solid #22d3ee !important;
          border-color: #22d3ee !important;
        }
      `}</style>

      <Header />
      <TabBar />

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {activeMainTab === 'dashboard' && <DashboardTab />}
        {activeMainTab === 'builder' && <BuilderTab />}
        {activeMainTab === 'templates' && <TemplatesTab />}
        {activeMainTab === 'context' && <ContextTab />}
        {activeMainTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
