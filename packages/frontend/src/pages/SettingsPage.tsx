import { useState } from "react";
import type { ModelProvider, ConnectionStatus, SkillLevel } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";
import { ThemePicker } from "../components/ThemePicker";
import { SkillLevelToggle } from "../components/SkillLevelToggle";
import { SafetySettingsView } from "../components/SafetySettingsView";

const providerInfo: { id: ModelProvider; name: string; placeholder: string; helpUrl: string }[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    placeholder: "sk-ant-api03-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    placeholder: "...",
    helpUrl: "https://console.mistral.ai/api-keys/",
  },
];

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    disconnected: "bg-zinc-500",
    validating: "bg-yellow-400 animate-pulse",
    connected: "bg-green-500",
    error: "bg-red-500",
  };
  return <div className={`w-2 h-2 rounded-full shrink-0 ${colors[status]}`} />;
}

function ProviderRow({ id, name, placeholder, helpUrl }: typeof providerInfo[number]) {
  const providers = useAppStore((s) => s.providers);
  const connectProvider = useAppStore((s) => s.connectProvider);
  const disconnectProvider = useAppStore((s) => s.disconnectProvider);
  const skillLevel = useAppStore((s) => s.skillLevel);

  const conn = providers.find((p) => p.provider === id);
  const status = conn?.status ?? "disconnected";
  const isConnected = status === "connected";

  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setError(null);
    setLoading(true);
    const result = await connectProvider(id, apiKey.trim());
    setLoading(false);
    if (result.ok) {
      setApiKey("");
    } else {
      setError(result.error ?? "Failed to connect");
    }
  };

  return (
    <div className="border border-border-default rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={status} />
        <span className="text-text-primary text-sm font-medium">{name}</span>
        {isConnected && conn?.maskedKey && (
          <span className="text-text-muted text-xs ml-auto font-mono">{conn.maskedKey}</span>
        )}
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-xs">
            {skillLevel === "beginner" ? "Connected and ready" : "Connected"}
          </span>
          <button
            onClick={() => disconnectProvider(id)}
            className="ml-auto text-xs text-red-400 hover:text-red-300"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 bg-surface-base text-text-primary text-sm rounded px-3 py-1.5 outline-none border border-border-default focus:border-border-focus"
              placeholder={placeholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
            <button
              onClick={handleConnect}
              disabled={loading || !apiKey.trim()}
              className="px-3 py-1.5 bg-accent-primary text-text-primary rounded text-sm hover:bg-accent-primary-hover disabled:opacity-50"
            >
              {loading ? "Checking..." : "Connect"}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted text-xs hover:text-text-secondary"
          >
            {skillLevel === "beginner" ? "Where do I find my API key?" : "Get API key"}
          </a>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const skillLevel = useAppStore((s) => s.skillLevel);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-12 px-6">
        <h2 className="text-text-primary text-2xl font-semibold">Settings</h2>
        <p className="text-text-secondary text-sm mt-2">
          {skillLevel === "beginner"
            ? "Configure your AI connections, theme, and preferences."
            : "LLM providers, theming, and workspace configuration."}
        </p>

        {/* Providers section */}
        <section className="mt-8">
          <h3 className="text-text-primary text-lg font-medium mb-4">
            {skillLevel === "beginner" ? "AI Connections" : "LLM Providers"}
          </h3>
          <p className="text-text-muted text-xs mb-4">
            {skillLevel === "beginner"
              ? "Enter your API key to use AI features. Your key stays on the server and is never stored on disk."
              : "API keys are stored in server memory only. Connect at least one provider to use execution features."}
          </p>
          <div className="flex flex-col gap-3">
            {providerInfo.map((p) => (
              <ProviderRow key={p.id} {...p} />
            ))}
          </div>
        </section>

        {/* Safety Rules section */}
        <section className="mt-10">
          <h3 className="text-text-primary text-lg font-medium mb-4">
            {skillLevel === "beginner" ? "Safety Rules" : "Safety & Permissions"}
          </h3>
          <p className="text-text-muted text-xs mb-4">
            {skillLevel === "beginner"
              ? "Control what each agent is allowed to do."
              : "Configure per-agent tool restrictions, bash blacklists, and permission modes."}
          </p>
          <SafetySettingsView />
        </section>

        {/* Appearance section */}
        <section className="mt-10">
          <h3 className="text-text-primary text-lg font-medium mb-4">Appearance</h3>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text-primary text-sm">Theme</span>
                <p className="text-text-muted text-xs mt-0.5">Color scheme for the interface</p>
              </div>
              <ThemePicker />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text-primary text-sm">Skill Level</span>
                <p className="text-text-muted text-xs mt-0.5">Controls label complexity and tooltips</p>
              </div>
              <SkillLevelToggle />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
