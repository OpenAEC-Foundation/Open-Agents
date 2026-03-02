import type { ExecutionStatus } from "@open-agents/shared";
import type React from "react";

/** Tailwind classes for node execution status indicator dots. */
export const STATUS_COLORS: Record<ExecutionStatus, string> = {
  idle: "bg-border-default",
  running: "bg-yellow-400 animate-pulse",
  completed: "bg-green-500",
  error: "bg-red-500",
  paused: "bg-yellow-400",
  cancelled: "bg-zinc-500",
};

/** Get border style for a canvas node based on execution status. */
export function getNodeBorderStyle(status: ExecutionStatus, idleBorderColor: string): React.CSSProperties {
  return {
    boxShadow:
      status === "running"
        ? undefined
        : status === "completed"
          ? "0 0 0 2px #22c55e"
          : status === "error"
            ? "0 0 0 2px #ef4444"
            : status === "paused"
              ? "0 0 0 2px #eab308"
              : `0 0 0 1px ${idleBorderColor}`,
  };
}
