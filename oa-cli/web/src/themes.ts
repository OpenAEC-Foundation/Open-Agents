export interface Theme {
  id: string;
  name: string;
  preview: { bg: string; sidebar: string; accent: string };
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    preview: { bg: '#f4f6f8', sidebar: '#edf0f3', accent: '#ff6b35' },
    vars: {
      '--color-oa-bg': '#f4f6f8',
      '--color-oa-surface': '#ffffff',
      '--color-oa-surface-hover': '#fff4f0',
      '--color-oa-sidebar': '#edf0f3',
      '--color-oa-border': '#e2e8f0',
      '--color-oa-border-light': '#eff2f5',
      '--color-oa-text': '#1e293b',
      '--color-oa-text-muted': '#64748b',
      '--color-oa-text-dim': '#94a3b8',
      '--color-oa-accent': '#ff6b35',
      '--color-oa-accent-bg': '#fff4f0',
      '--color-oa-accent-hover': '#e55a2a',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    preview: { bg: '#0f1117', sidebar: '#151820', accent: '#ff6b35' },
    vars: {
      '--color-oa-bg': '#0f1117',
      '--color-oa-surface': '#1a1d27',
      '--color-oa-surface-hover': '#21253a',
      '--color-oa-sidebar': '#151820',
      '--color-oa-border': '#2a2d3e',
      '--color-oa-border-light': '#232637',
      '--color-oa-text': '#e2e8f0',
      '--color-oa-text-muted': '#8892aa',
      '--color-oa-text-dim': '#4a5268',
      '--color-oa-accent': '#ff6b35',
      '--color-oa-accent-bg': '#2a1a12',
      '--color-oa-accent-hover': '#e55a2a',
    },
  },
  {
    id: 'impertio',
    name: 'Impertio',
    preview: { bg: '#0a0a0a', sidebar: '#111111', accent: '#ff6b00' },
    vars: {
      '--color-oa-bg': '#0a0a0a',
      '--color-oa-surface': '#141414',
      '--color-oa-surface-hover': '#1a1209',
      '--color-oa-sidebar': '#111111',
      '--color-oa-border': '#252525',
      '--color-oa-border-light': '#1e1e1e',
      '--color-oa-text': '#f0f0f0',
      '--color-oa-text-muted': '#888888',
      '--color-oa-text-dim': '#555555',
      '--color-oa-accent': '#ff6b00',
      '--color-oa-accent-bg': '#1f1200',
      '--color-oa-accent-hover': '#e05e00',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    preview: { bg: '#2e3440', sidebar: '#272c37', accent: '#88c0d0' },
    vars: {
      '--color-oa-bg': '#2e3440',
      '--color-oa-surface': '#3b4252',
      '--color-oa-surface-hover': '#434c5e',
      '--color-oa-sidebar': '#272c37',
      '--color-oa-border': '#434c5e',
      '--color-oa-border-light': '#3b4252',
      '--color-oa-text': '#eceff4',
      '--color-oa-text-muted': '#d8dee9',
      '--color-oa-text-dim': '#8892a4',
      '--color-oa-accent': '#88c0d0',
      '--color-oa-accent-bg': '#2e3e45',
      '--color-oa-accent-hover': '#6eadbf',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    preview: { bg: '#f8fafc', sidebar: '#f1f5f9', accent: '#6366f1' },
    vars: {
      '--color-oa-bg': '#f8fafc',
      '--color-oa-surface': '#ffffff',
      '--color-oa-surface-hover': '#f0f0ff',
      '--color-oa-sidebar': '#f1f5f9',
      '--color-oa-border': '#e2e8f0',
      '--color-oa-border-light': '#eff2f5',
      '--color-oa-text': '#0f172a',
      '--color-oa-text-muted': '#475569',
      '--color-oa-text-dim': '#94a3b8',
      '--color-oa-accent': '#6366f1',
      '--color-oa-accent-bg': '#eef2ff',
      '--color-oa-accent-hover': '#4f52d8',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    preview: { bg: '#0d1b2a', sidebar: '#0a1628', accent: '#00d4ff' },
    vars: {
      '--color-oa-bg': '#0d1b2a',
      '--color-oa-surface': '#132237',
      '--color-oa-surface-hover': '#152840',
      '--color-oa-sidebar': '#0a1628',
      '--color-oa-border': '#1e3a52',
      '--color-oa-border-light': '#162f45',
      '--color-oa-text': '#cfe8ff',
      '--color-oa-text-muted': '#7aabcc',
      '--color-oa-text-dim': '#3d6b8a',
      '--color-oa-accent': '#00d4ff',
      '--color-oa-accent-bg': '#041a24',
      '--color-oa-accent-hover': '#00b8dc',
    },
  },
];

export const DEFAULT_THEME_ID = 'light';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute('data-theme', theme.id);
  // Also update body background immediately to avoid flash
  document.body.style.background = theme.vars['--color-oa-bg'] ?? '';
}

export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
