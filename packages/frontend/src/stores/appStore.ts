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
