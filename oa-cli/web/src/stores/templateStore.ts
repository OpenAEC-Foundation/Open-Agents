import { create } from 'zustand';
import type { Template } from '../types';

interface TemplateStore {
  templates: Template[];
  searchQuery: string;
  selectedCategory: string;

  loadTemplates: () => void;
  saveTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  getFiltered: () => Template[];
}

const STORAGE_KEY = 'oa-templates';

function loadFromStorage(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultTemplates();
  } catch {
    return getDefaultTemplates();
  }
}

function saveToStorage(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function getDefaultTemplates(): Template[] {
  return [
    {
      id: 'tpl-code-review',
      name: 'Code Review',
      description: 'Automated code review pipeline with quality checks and suggestions.',
      category: 'Quality',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Review code for quality, bugs, and best practices' } },
        { id: 'n3', type: 'condition', position: { x: 600, y: 200 }, data: { conditionType: 'status', expression: 'status === "done"' } },
        { id: 'n4', type: 'output', position: { x: 850, y: 200 }, data: { outputType: 'merge' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4', label: 'Pass' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'tpl-bug-fixer',
      name: 'Bug Fixer',
      description: 'Finds and fixes bugs from issue reports with automated testing.',
      category: 'Development',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/opus', task: 'Analyze bug report and fix the issue' } },
        { id: 'n3', type: 'output', position: { x: 600, y: 200 }, data: { outputType: 'merge' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'tpl-doc-gen',
      name: 'Documentation Generator',
      description: 'Generates documentation from source code with examples and API references.',
      category: 'Documentation',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/haiku', task: 'Generate documentation from source code' } },
        { id: 'n3', type: 'output', position: { x: 600, y: 200 }, data: { outputType: 'file' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'tpl-test-runner',
      name: 'Test Runner',
      description: 'Runs test suites and reports results with coverage analysis.',
      category: 'Quality',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Run tests and analyze coverage' } },
        { id: 'n3', type: 'output', position: { x: 600, y: 200 }, data: { outputType: 'notify' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'tpl-refactor',
      name: 'Refactor Helper',
      description: 'Assists with code refactoring, maintaining backward compatibility.',
      category: 'Development',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Refactor code while maintaining compatibility' } },
        { id: 'n3', type: 'condition', position: { x: 600, y: 200 }, data: { conditionType: 'status', expression: 'status === "done"' } },
        { id: 'n4', type: 'agent', position: { x: 850, y: 300 }, data: { model: 'claude/sonnet', task: 'Run tests to verify refactoring' } },
        { id: 'n5', type: 'output', position: { x: 850, y: 100 }, data: { outputType: 'merge' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n5', label: 'Pass' },
        { id: 'e4', source: 'n3', target: 'n4', label: 'Fail' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'tpl-security',
      name: 'Security Audit',
      description: 'Scans codebase for security vulnerabilities and suggests fixes.',
      category: 'Security',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/opus', task: 'Audit code for security vulnerabilities' } },
        { id: 'n3', type: 'output', position: { x: 600, y: 200 }, data: { outputType: 'file' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
      ],
      config: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  searchQuery: '',
  selectedCategory: 'all',

  loadTemplates: () => {
    set({ templates: loadFromStorage() });
  },

  saveTemplate: (template) => {
    const templates = [...get().templates];
    const idx = templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      templates[idx] = { ...template, updatedAt: Date.now() };
    } else {
      templates.push({ ...template, createdAt: Date.now(), updatedAt: Date.now() });
    }
    saveToStorage(templates);
    set({ templates });
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    saveToStorage(templates);
    set({ templates });
  },

  duplicateTemplate: (id) => {
    const original = get().templates.find((t) => t.id === id);
    if (!original) return;
    const dup: Template = {
      ...original,
      id: `tpl-${Date.now()}`,
      name: `${original.name} (copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const templates = [...get().templates, dup];
    saveToStorage(templates);
    set({ templates });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategory: (category) => set({ selectedCategory: category }),

  getFiltered: () => {
    const { templates, searchQuery, selectedCategory } = get();
    return templates.filter((t) => {
      const matchesSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  },
}));
