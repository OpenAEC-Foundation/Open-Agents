import { create, type StoreApi, type UseBoundStore } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AppState } from "./types";
import { createCanvasSlice } from "./slices/canvasSlice";
import { createSelectionSlice } from "./slices/selectionSlice";
import { createHistorySlice } from "./slices/historySlice";
import { createUISlice } from "./slices/uiSlice";
import { createSettingsSlice } from "./slices/settingsSlice";
import { createExecutionSlice } from "./slices/executionSlice";
import { createWorkspaceSlice } from "./slices/workspaceSlice";
import { createFactorySlice } from "./slices/factorySlice";
import { createSafetySlice } from "./slices/safetySlice";
import { createAuditSlice } from "./slices/auditSlice";
import { createAssemblySlice } from "./slices/assemblySlice";

export const useAppStore: UseBoundStore<StoreApi<AppState>> = create<AppState>()(
  immer(
    devtools(
      persist(
        (...a) => ({
          ...createCanvasSlice(...a),
          ...createSelectionSlice(...a),
          ...createHistorySlice(...a),
          ...createUISlice(...a),
          ...createSettingsSlice(...a),
          ...createExecutionSlice(...a),
          ...createWorkspaceSlice(...a),
          ...createFactorySlice(...a),
          ...createSafetySlice(...a),
          ...createAuditSlice(...a),
          ...createAssemblySlice(...a),
        }),
        {
          name: "open-agents-store",
          partialize: (state) => ({
            skillLevel: state.skillLevel,
            themeId: state.themeId,
          }),
        },
      ),
      { name: "OpenAgents" },
    ),
  ),
);
