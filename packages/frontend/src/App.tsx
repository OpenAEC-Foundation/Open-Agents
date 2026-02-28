import { useEffect } from "react";
import type { AppTab } from "@open-agents/shared";
import { useAppStore } from "./stores/appStore";
import { getTheme, applyTheme } from "./themes/themes";
import { ConnectionIndicator } from "./components/ConnectionIndicator";
import { ConnectModal } from "./components/ConnectModal";
import { CanvasPage } from "./pages/CanvasPage";
import { FactoryPage } from "./pages/FactoryPage";
import { LibraryPage } from "./pages/LibraryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RunHistoryView } from "./components/RunHistoryView";

const tabs: { id: AppTab; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "runs", label: "Runs" },
  { id: "factory", label: "Factory" },
  { id: "library", label: "Library" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const themeId = useAppStore((s) => s.themeId);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  useEffect(() => {
    applyTheme(getTheme(themeId));
  }, [themeId]);

  // Undo/Redo keyboard shortcuts (global)
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return (
    <div className="w-full h-full flex flex-col font-sans">
      {/* Header with tab navigation */}
      <header className="h-12 bg-surface-raised text-text-primary flex items-center px-4 gap-1 shrink-0 border-b border-border-default">
        <h1 className="text-lg font-semibold mr-4">Open-Agents</h1>

        {/* Tab navigation */}
        <nav className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-accent-primary/15 text-accent-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-overlay/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ConnectionIndicator />
        </div>
      </header>

      {/* Page content */}
      {activeTab === "canvas" && <CanvasPage />}
      {activeTab === "runs" && <RunHistoryView />}
      {activeTab === "factory" && <FactoryPage />}
      {activeTab === "library" && <LibraryPage />}
      {activeTab === "settings" && <SettingsPage />}

      {/* Global modal (kept for backwards compat — header indicator opens it) */}
      <ConnectModal />
    </div>
  );
}
