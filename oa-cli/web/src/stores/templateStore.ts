import { create } from 'zustand';
import { fetchTemplates, type BackendTemplate } from '../api/client';
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
    const stored: Template[] = raw ? JSON.parse(raw) : [];
    const coreIds = new Set(getCoreAgentTemplates().map((t) => t.id));
    const userTemplates = stored.filter((t) => !coreIds.has(t.id));
    return [...getCoreAgentTemplates(), ...userTemplates];
  } catch {
    return getDefaultTemplates();
  }
}

function saveToStorage(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function getCoreAgentTemplates(): Template[] {
  return [
    {
      id: 'core-researcher',
      name: 'Researcher',
      description: 'Research a topic in depth and produce a structured report with key findings, sources, and recommendations.',
      category: 'Research',
      systemPrompt: 'Research the following topic in depth and produce a structured report with key findings, sources, and recommendations:\n\n[Topic here]',
      modelHint: 'claude/sonnet',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Research the following topic in depth and produce a structured report with key findings, sources, and recommendations:\n\n[Topic here]' } },
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
      id: 'core-developer',
      name: 'Developer',
      description: 'Implement a feature or fix. Reads relevant files first, then writes clean, well-structured code.',
      category: 'Development',
      systemPrompt: 'Implement the following feature/fix. Read relevant files first, then write clean, well-structured code:\n\n[Task here]',
      modelHint: 'claude/sonnet',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Implement the following feature/fix. Read relevant files first, then write clean, well-structured code:\n\n[Task here]' } },
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
      id: 'core-reviewer',
      name: 'Reviewer',
      description: 'Review code or a document for quality, correctness, and improvements with actionable feedback.',
      category: 'Quality',
      systemPrompt: 'Review the following code or document for quality, correctness, and improvements. Provide actionable feedback:\n\n[File or content here]',
      modelHint: 'claude/sonnet',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/sonnet', task: 'Review the following code or document for quality, correctness, and improvements. Provide actionable feedback:\n\n[File or content here]' } },
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
      id: 'core-analyzer',
      name: 'Analyzer',
      description: 'Analyze data, logs, or a codebase and provide a structured breakdown of patterns, issues, and insights.',
      category: 'Analysis',
      systemPrompt: 'Analyze the following data, logs, or codebase and provide a structured breakdown of patterns, issues, and insights:\n\n[Input here]',
      modelHint: 'claude/haiku',
      nodes: [
        { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
        { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model: 'claude/haiku', task: 'Analyze the following data, logs, or codebase and provide a structured breakdown of patterns, issues, and insights:\n\n[Input here]' } },
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

function getDefaultTemplates(): Template[] {
  return [
    ...getCoreAgentTemplates(),
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

function mapBackendTemplate(bt: BackendTemplate): Template {
  const now = Date.now();
  // Normalise directory-style categories like "code-dev" → "Code Dev"
  const rawCat = bt.category || '';
  const category = rawCat
    ? rawCat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'General';
  const model = bt.modelHint || 'claude/sonnet';
  return {
    id: bt.id,
    name: bt.name,
    description: bt.description || bt.systemPrompt?.slice(0, 120) || bt.name,
    category,
    systemPrompt: bt.systemPrompt,
    modelHint: model,
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, data: { triggerType: 'manual' } },
      { id: 'n2', type: 'agent', position: { x: 350, y: 200 }, data: { model, task: bt.systemPrompt } },
      { id: 'n3', type: 'output', position: { x: 600, y: 200 }, data: { outputType: 'file' } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
    config: {},
    createdAt: now,
    updatedAt: now,
  };
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  searchQuery: '',
  selectedCategory: 'all',

  loadTemplates: async () => {
    try {
      const backendTemplates = await fetchTemplates();
      const apiTemplates = backendTemplates.map(mapBackendTemplate);
      const apiIds = new Set(apiTemplates.map((t) => t.id));

      // Merge: API templates take precedence; keep user localStorage templates not in API set
      let raw: Template[] = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        raw = stored ? (JSON.parse(stored) as Template[]) : [];
      } catch {
        // ignore
      }
      const coreIds = new Set(getCoreAgentTemplates().map((t) => t.id));
      const userTemplates = raw.filter((t) => !coreIds.has(t.id) && !apiIds.has(t.id));
      set({ templates: [...apiTemplates, ...userTemplates] });
    } catch {
      // Bridge down or endpoint not implemented — fall back to local storage + defaults
      set({ templates: loadFromStorage() });
    }
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
