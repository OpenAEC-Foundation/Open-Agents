import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";

export function ConnectionIndicator() {
  const providers = useSettingsStore((s) => s.providers);
  const fetchConnections = useSettingsStore((s) => s.fetchConnections);
  const setConnectModalOpen = useSettingsStore((s) => s.setConnectModalOpen);
  const skillLevel = useSettingsStore((s) => s.skillLevel);

  // Fetch connection status on mount
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connectedCount = providers.filter((p) => p.status === "connected").length;
  const hasAny = connectedCount > 0;

  return (
    <button
      onClick={() => setConnectModalOpen(true)}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
        hasAny
          ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
          : "bg-red-900/30 text-red-400 hover:bg-red-900/50"
      }`}
      title={hasAny ? `${connectedCount} provider(s) connected` : "No providers connected"}
    >
      <div className={`w-2 h-2 rounded-full ${hasAny ? "bg-green-500" : "bg-red-500"}`} />
      {skillLevel === "beginner"
        ? hasAny ? "AI Connected" : "Connect AI"
        : hasAny ? `${connectedCount} connected` : "No providers"}
    </button>
  );
}
