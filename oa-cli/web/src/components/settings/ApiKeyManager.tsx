import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';

export function ApiKeyManager() {
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const [newProvider, setNewProvider] = useState('');
  const [newKey, setNewKey] = useState('');

  const handleAdd = () => {
    if (!newProvider.trim() || !newKey.trim()) return;
    updateSetting('apiKeys', { ...apiKeys, [newProvider.trim()]: newKey.trim() });
    setNewProvider('');
    setNewKey('');
    saveSettings();
  };

  const handleRemove = (provider: string) => {
    const updated = { ...apiKeys };
    delete updated[provider];
    updateSetting('apiKeys', updated);
    saveSettings();
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-oa-text">API Keys</h3>

      {/* Existing keys */}
      <div className="space-y-2">
        {Object.entries(apiKeys).length === 0 ? (
          <div className="text-xs text-oa-text-dim">No API keys configured</div>
        ) : (
          Object.entries(apiKeys).map(([provider, key]) => (
            <div key={provider} className="flex items-center gap-3 px-3 py-2 bg-oa-bg border border-oa-border rounded-md">
              <span className="text-xs font-semibold text-oa-text min-w-[100px]">{provider}</span>
              <span className="text-xs font-mono text-oa-text-dim flex-1">{maskKey(key)}</span>
              <button
                onClick={() => handleRemove(provider)}
                className="text-red-400 text-xs cursor-pointer hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add new key */}
      <div className="space-y-2">
        <div className="text-xs text-oa-text-muted font-semibold">Add API Key</div>
        <div className="flex gap-2">
          <input
            placeholder="Provider (e.g. anthropic)"
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value)}
            className="w-40 px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs"
          />
          <input
            placeholder="API key"
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="flex-1 px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs font-mono"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-oa-accent text-oa-bg rounded-md text-xs font-bold cursor-pointer hover:brightness-110"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
