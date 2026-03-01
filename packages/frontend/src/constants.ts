import type { ExecutionStatus } from "@open-agents/shared";

/** Tailwind classes for node execution status indicator dots. */
export const STATUS_COLORS: Record<ExecutionStatus, string> = {
  idle: "bg-border-default",
  running: "bg-yellow-400 animate-pulse",
  completed: "bg-green-500",
  error: "bg-red-500",
  paused: "bg-yellow-400",
  cancelled: "bg-zinc-500",
};
