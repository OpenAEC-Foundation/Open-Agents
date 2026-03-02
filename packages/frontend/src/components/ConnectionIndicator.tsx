import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";
import { checkBridgeHealth, connectBridgeWebSocket } from "../services/bridgeService";

export function ConnectionIndicator() {
  const providers = useAppStore((s) => s.providers);
  const fetchConnections = useAppStore((s) => s.fetchConnections);
  const setConnectModalOpen = useAppStore((s) => s.setConnectModalOpen);
  const skillLevel = useAppStore((s) => s.skillLevel);
  const [bridgeOnline, setBridgeOnline] = useState(false);

  // Fetch connection status on mount
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Check VS Code bridge status and connect WebSocket
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await checkBridgeHealth();
      if (mounted) {
        setBridgeOnline(ok);
        if (ok) connectBridgeWebSocket();
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const connectedCount = providers.filter((p) => p.status === "connected").length;
  const hasAny = connectedCount > 0;

  return (
    <div className="flex items-center gap-2">
      {/* VS Code Bridge indicator */}
      <div
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md ${
          bridgeOnline
            ? "bg-blue-900/30 text-blue-400"
            : "bg-neutral-800/50 text-neutral-500"
        }`}
        title={bridgeOnline ? "VS Code bridge connected — cli/claude available" : "VS Code bridge offline"}
      >
        <div className={`w-2 h-2 rounded-full ${bridgeOnline ? "bg-blue-500" : "bg-neutral-600"}`} />
        {bridgeOnline ? "Bridge" : "No bridge"}
      </div>

      {/* Provider indicator */}
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
    </div>
  );
}
