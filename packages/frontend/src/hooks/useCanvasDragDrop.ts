import { useCallback, type RefObject, type DragEvent } from "react";
import type { AgentNodeData } from "@open-agents/shared";
import { useAppStore } from "../stores/appStore";

/** Hook encapsulating canvas drag-and-drop logic */
export function useCanvasDragDrop(wrapperRef: RefObject<HTMLDivElement | null>) {
  const addNode = useAppStore((s) => s.addNode);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/open-agents-preset");
      if (!raw) return;

      const data = JSON.parse(raw) as AgentNodeData;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;

      addNode(data, {
        x: e.clientX - bounds.left - 120,
        y: e.clientY - bounds.top - 40,
      });
    },
    [addNode, wrapperRef],
  );

  return { onDragOver, onDrop };
}
