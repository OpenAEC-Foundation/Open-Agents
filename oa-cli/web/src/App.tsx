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
import { ChatPanel } from './components/chat/ChatPanel';
import Onboarding from './components/Onboarding';
import { DemoTab } from './components/demo/DemoTab';
import { applyTheme, getThemeById } from './themes';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';
import { KeyboardHelpOverlay } from './components/KeyboardHelpOverlay';
import { CommandPalette } from './components/CommandPalette';
import { AgentSpawnDialog } from './components/AgentSpawnDialog';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('oa_onboarded'));
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const activeMainTab = useUIStore((s) => s.activeMainTab);
  const themeId = useUIStore((s) => s.themeId);
  const fetchAgents = useAgentStore((s) => s.fetchAgents);

  useKeyboardShortcuts({
    onToggleHelp: () => setShowKeyboardHelp((v) => !v),
    onToggleCommandPalette: () => setShowCommandPalette((v) => !v),
    onToggleSpawnDialog: () => setShowSpawnDialog((v) => !v),
  });

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(getThemeById(themeId));
  }, [themeId]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 2000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  if (!onboarded) {
    return (
      <ToastProvider>
        <ErrorBoundary>
          <Onboarding onComplete={() => setOnboarded(true)} />
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
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
          {activeMainTab === 'dashboard' && (
            <ErrorBoundary>
              <DashboardTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'builder' && (
            <ErrorBoundary>
              <BuilderTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'templates' && (
            <ErrorBoundary>
              <TemplatesTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'context' && (
            <ErrorBoundary>
              <ContextTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'teams' && (
            <ErrorBoundary>
              <TeamsTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'chat' && (
            <ErrorBoundary>
              <ChatPanel />
            </ErrorBoundary>
          )}
          {activeMainTab === 'settings' && (
            <ErrorBoundary>
              <SettingsTab />
            </ErrorBoundary>
          )}
          {activeMainTab === 'demo' && (
            <ErrorBoundary>
              <DemoTab />
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Global overlays */}
      {showKeyboardHelp && (
        <KeyboardHelpOverlay onClose={() => setShowKeyboardHelp(false)} />
      )}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
      {showSpawnDialog && (
        <AgentSpawnDialog onClose={() => setShowSpawnDialog(false)} />
      )}
    </ToastProvider>
  );
}
