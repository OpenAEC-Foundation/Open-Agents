import { useSettingsStore } from '../../stores/settingsStore';

export function ModelConfig() {
  const defaultModel = useSettingsStore((s) => s.defaultModel);
  const maxConcurrentAgents = useSettingsStore((s) => s.maxConcurrentAgents);
  const defaultTimeout = useSettingsStore((s) => s.defaultTimeout);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-oa-text mb-4">Model Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-oa-text-muted block mb-1.5">Default Model</label>
            <select
              value={defaultModel}
              onChange={(e) => updateSetting('defaultModel', e.target.value)}
              className="w-full max-w-md px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs font-mono"
            >
              <option value="claude/opus">claude/opus</option>
              <option value="claude/sonnet">claude/sonnet</option>
              <option value="claude/haiku">claude/haiku</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-oa-text-muted block mb-1.5">Max Concurrent Agents</label>
            <input
              type="number"
              value={maxConcurrentAgents}
              onChange={(e) => updateSetting('maxConcurrentAgents', parseInt(e.target.value) || 1)}
              min={1}
              max={20}
              className="w-32 px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-oa-text-muted block mb-1.5">Default Timeout (seconds)</label>
            <input
              type="number"
              value={defaultTimeout}
              onChange={(e) => updateSetting('defaultTimeout', parseInt(e.target.value) || 60)}
              min={30}
              max={3600}
              className="w-32 px-3 py-2 bg-oa-bg border border-neutral-700 rounded-md text-oa-text text-xs font-mono"
            />
          </div>
        </div>
      </div>

      <button
        onClick={saveSettings}
        className="px-6 py-2 bg-oa-accent text-oa-bg rounded-md text-xs font-bold cursor-pointer hover:brightness-110"
      >
        Save Changes
      </button>
    </div>
  );
}
