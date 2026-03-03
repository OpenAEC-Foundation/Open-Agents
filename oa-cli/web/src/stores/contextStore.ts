import { create } from 'zustand';
import type { ContextItem, Snippet } from '../types';

interface ContextStore {
  items: ContextItem[];
  snippets: Snippet[];
  customInstructions: string;

  addItem: (item: ContextItem) => void;
  removeItem: (id: string) => void;
  reorderItems: (from: number, to: number) => void;
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: string) => void;
  setInstructions: (text: string) => void;
  getTotalTokens: () => number;
  exportContext: () => string;
  clearAll: () => void;
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'snip-api',
    name: 'API Guidelines',
    content: 'Follow REST API conventions. Use proper HTTP methods, status codes, and JSON response format. Include error handling for all endpoints.',
    category: 'Guidelines',
  },
  {
    id: 'snip-code',
    name: 'Code Standards',
    content: 'Use TypeScript strict mode. Prefer functional components with hooks. Follow the project naming conventions. Write tests for new features.',
    category: 'Guidelines',
  },
  {
    id: 'snip-error',
    name: 'Error Handling',
    content: 'Use try-catch blocks for async operations. Return descriptive error messages. Log errors to monitoring service. Never expose internal error details to clients.',
    category: 'Patterns',
  },
];

export const useContextStore = create<ContextStore>((set, get) => ({
  items: [],
  snippets: DEFAULT_SNIPPETS,
  customInstructions: '',

  addItem: (item) => {
    set((s) => ({ items: [...s.items, item] }));
  },

  removeItem: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  reorderItems: (from, to) => {
    const items = [...get().items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    set({ items });
  },

  addSnippet: (snippet) => {
    set((s) => ({ snippets: [...s.snippets, snippet] }));
  },

  removeSnippet: (id) => {
    set((s) => ({ snippets: s.snippets.filter((sn) => sn.id !== id) }));
  },

  setInstructions: (text) => set({ customInstructions: text }),

  getTotalTokens: () => {
    return get().items.reduce((sum, item) => sum + item.tokens, 0);
  },

  exportContext: () => {
    const { items, customInstructions } = get();
    const parts: string[] = [];

    for (const item of items) {
      if (item.type === 'file') {
        parts.push(`## File: ${item.name}\n\`\`\`\n${item.content}\n\`\`\``);
      } else if (item.type === 'snippet') {
        parts.push(`## Snippet: "${item.name}"\n${item.content}`);
      }
    }

    if (customInstructions.trim()) {
      parts.push(`## Custom Instructions\n${customInstructions}`);
    }

    return parts.join('\n\n');
  },

  clearAll: () => set({ items: [], customInstructions: '' }),
}));
