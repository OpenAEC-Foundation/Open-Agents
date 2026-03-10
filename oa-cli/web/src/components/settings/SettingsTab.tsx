import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { ModelConfig } from './ModelConfig';
import { ApiKeyManager } from './ApiKeyManager';

type SettingsSection = 'models' | 'local-llm' | 'api-keys' | 'general';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'models', label: 'Model Config' },
  { id: 'local-llm', label: 'Local LLMs' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'general', label: 'General' },
];

export function SettingsTab() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('models');
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const ollamaEndpoint = useSettingsStore((s) => s.ollamaEndpoint);
  const ollamaModels = useSettingsStore((s) => s.ollamaModels);
  const ollamaStatus = useSettingsStore((s) => s.ollamaStatus);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const testOllamaConnection = useSettingsStore((s) => s.testOllamaConnection);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Settings navigation */}
      <div className="w-[200px] min-w-[200px] border-r border-oa-border bg-oa-bg">
        <div className="px-3 py-2 border-b border-oa-border-light text-[10px] font-bold text-oa-text-muted uppercase tracking-widest">
          Settings
        </div>
        <div className="p-2 space-y-0.5">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs cursor-pointer transition-colors font-semibold`}
              style={{
                background: activeSection === section.id ? 'var(--color-oa-accent-bg)' : 'transparent',
                color: activeSection === section.id ? 'var(--color-oa-accent)' : 'var(--color-oa-text-muted)',
              }}
              onMouseEnter={(e) => {
                if (activeSection !== section.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-oa-surface)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== section.id) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-oa-text-muted)';
                }
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Settings content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === 'models' && <ModelConfig />}

        {activeSection === 'local-llm' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-oa-text">Local LLM Setup (Ollama)</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-oa-text-muted block mb-1.5">Ollama Endpoint</label>
                <div className="flex gap-2">
                  <input
                    value={ollamaEndpoint}
                    onChange={(e) => updateSetting('ollamaEndpoint', e.target.value)}
                    className="flex-1 max-w-md px-3 py-2 bg-oa-bg border rounded-md text-oa-text text-xs font-mono"
                    style={{ borderColor: 'var(--color-oa-border)' }}
                  />
                  <button
                    onClick={testOllamaConnection}
                    className="px-4 py-2 bg-oa-surface border border-oa-border text-oa-text-muted rounded-md text-xs cursor-pointer hover:text-oa-text"
                  >
                    Test Connection
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    ollamaStatus === 'connected' ? 'bg-status-done' :
                    ollamaStatus === 'disconnected' ? 'bg-status-failed' :
                    ''
                  }`}
                  style={{
                    background: (ollamaStatus !== 'connected' && ollamaStatus !== 'disconnected') ? 'var(--color-oa-border)' : undefined
                  }}
                />
                <span className="text-xs text-oa-text-muted capitalize">{ollamaStatus}</span>
              </div>

              {ollamaModels.length > 0 && (
                <div>
                  <div className="text-xs text-oa-text-muted mb-2">Available Models</div>
                  <div className="space-y-1">
                    {ollamaModels.map((model) => (
                      <div key={model} className="px-3 py-1.5 bg-oa-bg border border-oa-border rounded text-xs font-mono text-oa-text">
                        {model}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveSettings}
              className="px-6 py-2 bg-oa-accent text-oa-bg rounded-md text-xs font-bold cursor-pointer hover:brightness-110"
            >
              Save Changes
            </button>
          </div>
        )}

        {activeSection === 'api-keys' && <ApiKeyManager />}

        {activeSection === 'general' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-oa-text">General Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-oa-text-muted block mb-1.5">Theme</label>
                <select className="px-3 py-2 bg-oa-bg border rounded-md text-oa-text text-xs" style={{ borderColor: 'var(--color-oa-border)' }}>
                  <option value="dark">Dark (Default)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-oa-text-muted block mb-1.5">Auto-refresh Interval (ms)</label>
                <input
                  type="number"
                  defaultValue={2000}
                  min={500}
                  max={10000}
                  className="w-32 px-3 py-2 bg-oa-bg border rounded-md text-oa-text text-xs font-mono"
                  style={{ borderColor: 'var(--color-oa-border)' }}
                />
              </div>
              <div>
                <label className="text-xs text-oa-text-muted block mb-1.5">Max Activity Log Entries</label>
                <input
                  type="number"
                  defaultValue={50}
                  min={10}
                  max={200}
                  className="w-32 px-3 py-2 bg-oa-bg border rounded-md text-oa-text text-xs font-mono"
                  style={{ borderColor: 'var(--color-oa-border)' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
