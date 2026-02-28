/**
 * Theme definitions for Open-Agents.
 *
 * Each theme is a record of --oa-* CSS custom property values.
 * At runtime, the selected theme's values are applied to document.documentElement.
 * The CSS @theme block in index.css maps these to Tailwind utility classes.
 *
 * To add a new theme: add an entry to `themes` with all required tokens.
 */

export interface Theme {
  id: string;
  label: string;
  description: string;
  /** Preview swatches shown in the theme picker [accent, secondary] */
  swatches: [string, string];
  tokens: Record<string, string>;
}

const impertio: Theme = {
  id: "impertio",
  label: "Impertio",
  description: "Electric Orange & Matrix Green — Impertio Studio huisstijl",
  swatches: ["#ff6b00", "#00ff88"],
  tokens: {
    "--oa-surface-base": "#0a0a0a",
    "--oa-surface-raised": "#1a1a1a",
    "--oa-surface-overlay": "#2d2d2d",
    "--oa-surface-input": "#0a0a0a",
    "--oa-border-default": "#404040",
    "--oa-border-subtle": "#333333",
    "--oa-border-focus": "#ff6b00",
    "--oa-text-primary": "#ffffff",
    "--oa-text-secondary": "#b3b3b3",
    "--oa-text-tertiary": "#8a8a8a",
    "--oa-text-muted": "#666666",
    "--oa-accent-primary": "#ff6b00",
    "--oa-accent-primary-hover": "#ff8c00",
    "--oa-accent-secondary": "#00ff88",
    "--oa-accent-code": "#00cc6a",
    "--oa-font-sans": "'Montserrat Variable', system-ui, -apple-system, sans-serif",
    "--oa-font-mono": "'JetBrains Mono Variable', ui-monospace, monospace",
  },
};

const neutral: Theme = {
  id: "neutral",
  label: "Neutral",
  description: "Clean dark with blue accents — generic Open-Agents look",
  swatches: ["#2563eb", "#34d399"],
  tokens: {
    "--oa-surface-base": "#18181b",
    "--oa-surface-raised": "#27272a",
    "--oa-surface-overlay": "#3f3f46",
    "--oa-surface-input": "#18181b",
    "--oa-border-default": "#3f3f46",
    "--oa-border-subtle": "#52525b",
    "--oa-border-focus": "#60a5fa",
    "--oa-text-primary": "#ffffff",
    "--oa-text-secondary": "#d4d4d8",
    "--oa-text-tertiary": "#a1a1aa",
    "--oa-text-muted": "#71717a",
    "--oa-accent-primary": "#2563eb",
    "--oa-accent-primary-hover": "#1d4ed8",
    "--oa-accent-secondary": "#34d399",
    "--oa-accent-code": "#4ade80",
    "--oa-font-sans": "system-ui, -apple-system, sans-serif",
    "--oa-font-mono": "ui-monospace, 'Cascadia Code', monospace",
  },
};

const midnight: Theme = {
  id: "midnight",
  label: "Midnight",
  description: "Deep navy with violet & cyan accents",
  swatches: ["#8b5cf6", "#22d3ee"],
  tokens: {
    "--oa-surface-base": "#0f0d1a",
    "--oa-surface-raised": "#1a1730",
    "--oa-surface-overlay": "#252240",
    "--oa-surface-input": "#0f0d1a",
    "--oa-border-default": "#3b3660",
    "--oa-border-subtle": "#2d2850",
    "--oa-border-focus": "#8b5cf6",
    "--oa-text-primary": "#f0eeff",
    "--oa-text-secondary": "#b8b0d8",
    "--oa-text-tertiary": "#8880a8",
    "--oa-text-muted": "#5e5880",
    "--oa-accent-primary": "#8b5cf6",
    "--oa-accent-primary-hover": "#7c3aed",
    "--oa-accent-secondary": "#22d3ee",
    "--oa-accent-code": "#67e8f9",
    "--oa-font-sans": "'Montserrat Variable', system-ui, -apple-system, sans-serif",
    "--oa-font-mono": "'JetBrains Mono Variable', ui-monospace, monospace",
  },
};

export const themes: Theme[] = [impertio, neutral, midnight];

export const defaultThemeId = "impertio";

export function getTheme(id: string): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
}
