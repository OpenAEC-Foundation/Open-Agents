import { useAppStore } from "./appStore";
import type { AgentNodeData } from "@open-agents/shared";

// === Canvas Selectors ===
export const useNodes = () => useAppStore((s) => s.nodes);
export const useEdges = () => useAppStore((s) => s.edges);
export const useOnNodesChange = () => useAppStore((s) => s.onNodesChange);
export const useOnEdgesChange = () => useAppStore((s) => s.onEdgesChange);
export const useOnConnect = () => useAppStore((s) => s.onConnect);
export const useAddNode = () => useAppStore((s) => s.addNode);
export const useUpdateNodeData = () => useAppStore((s) => s.updateNodeData);
export const useRemoveNode = () => useAppStore((s) => s.removeNode);
export const useGetCanvasConfig = () => useAppStore((s) => s.getCanvasConfig);

// === Selection Selectors ===
export const useSelectedNodeIds = () => useAppStore((s) => s.selectedNodeIds);
export const useSelectedEdgeIds = () => useAppStore((s) => s.selectedEdgeIds);
export const useHasSelection = () =>
  useAppStore((s) => s.selectedNodeIds.size > 0 || s.selectedEdgeIds.size > 0);
export const useClearSelection = () => useAppStore((s) => s.clearSelection);
export const useDeleteSelected = () => useAppStore((s) => s.deleteSelected);

// === History Selectors ===
export const useCanUndo = () => useAppStore((s) => s.canUndo);
export const useCanRedo = () => useAppStore((s) => s.canRedo);
export const useUndo = () => useAppStore((s) => s.undo);
export const useRedo = () => useAppStore((s) => s.redo);

// === UI Selectors ===
export const useSidebarOpen = () => useAppStore((s) => s.sidebarOpen);
export const useExportedJson = () => useAppStore((s) => s.exportedJson);
export const useSetExportedJson = () => useAppStore((s) => s.setExportedJson);
export const useConnectModalOpen = () => useAppStore((s) => s.connectModalOpen);
export const useSetConnectModalOpen = () => useAppStore((s) => s.setConnectModalOpen);

// === Settings Selectors ===
export const useSkillLevel = () => useAppStore((s) => s.skillLevel);
export const useThemeId = () => useAppStore((s) => s.themeId);
export const useSetThemeId = () => useAppStore((s) => s.setThemeId);
export const useProviders = () => useAppStore((s) => s.providers);
export const useFetchConnections = () => useAppStore((s) => s.fetchConnections);
export const useConnectProvider = () => useAppStore((s) => s.connectProvider);
export const useDisconnectProvider = () => useAppStore((s) => s.disconnectProvider);
export const useSetSkillLevel = () => useAppStore((s) => s.setSkillLevel);

// === Execution / Chat Selectors ===
export const useActiveNodeId = () => useAppStore((s) => s.activeNodeId);
export const useIsStreaming = () => useAppStore((s) => s.isStreaming);
export const useStreamingContent = () => useAppStore((s) => s.streamingContent);
export const useOpenChat = () => useAppStore((s) => s.openChat);
export const useCloseChat = () => useAppStore((s) => s.closeChat);
export const useSendMessage = () => useAppStore((s) => s.sendMessage);
export const useClearChatHistory = () => useAppStore((s) => s.clearChatHistory);
export const useNodeMessages = (nodeId: string) =>
  useAppStore((s) => s.messages[nodeId] ?? []);

// === Workspace Selectors ===
export const useActiveDocumentId = () => useAppStore((s) => s.activeDocumentId);
export const useDocuments = () => useAppStore((s) => s.documents);

// === Compound Selectors ===
export const useActiveNodeData = () =>
  useAppStore((s) => {
    if (!s.activeNodeId) return null;
    const node = s.nodes.find((n) => n.id === s.activeNodeId);
    return (node?.data as unknown as AgentNodeData) ?? null;
  });
