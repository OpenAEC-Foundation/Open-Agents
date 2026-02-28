import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";

/** Hook that registers Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts for undo/redo */
export function useUndoRedoShortcuts() {
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
}
