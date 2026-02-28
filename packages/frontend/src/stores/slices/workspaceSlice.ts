import type { SliceCreator, WorkspaceSlice, CanvasDocument } from "../types";

let docCounter = 1;

export const createWorkspaceSlice: SliceCreator<WorkspaceSlice> = (set, get) => {
  const defaultId = "default";

  return {
    documents: new Map<string, CanvasDocument>([
      [
        defaultId,
        {
          id: defaultId,
          name: "Untitled Canvas",
          nodes: [],
          edges: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    ]),
    activeDocumentId: defaultId,

    createDocument: (name) => {
      const id = `doc-${++docCounter}`;
      const doc: CanvasDocument = {
        id,
        name: name ?? `Canvas ${docCounter}`,
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => {
        state.documents.set(id, doc);
      });
      return id;
    },

    switchDocument: (id) => {
      const { documents, activeDocumentId, nodes, edges } = get();
      if (!documents.has(id) || id === activeDocumentId) return;

      // Save current canvas to the active document
      const currentDoc = documents.get(activeDocumentId);
      if (currentDoc) {
        set((state) => {
          const doc = state.documents.get(activeDocumentId);
          if (doc) {
            doc.nodes = [...state.nodes];
            doc.edges = [...state.edges];
            doc.updatedAt = new Date().toISOString();
          }
        });
      }

      // Load the target document
      const targetDoc = documents.get(id);
      if (targetDoc) {
        set((state) => {
          state.nodes = [...targetDoc.nodes];
          state.edges = [...targetDoc.edges];
          state.activeDocumentId = id;
        });
        get().clearHistory();
      }
    },

    deleteDocument: (id) => {
      const { documents, activeDocumentId } = get();
      if (documents.size <= 1) return; // Don't delete last document
      if (id === activeDocumentId) return; // Don't delete active document

      set((state) => {
        state.documents.delete(id);
      });
    },

    renameDocument: (id, name) => {
      set((state) => {
        const doc = state.documents.get(id);
        if (doc) doc.name = name;
      });
    },
  };
};
