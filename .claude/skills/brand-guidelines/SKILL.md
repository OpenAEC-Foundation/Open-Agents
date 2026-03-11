---
name: brand-guidelines
description: Applies OpenAEC Foundation brand to artifacts. WORKSPACE OVERRIDE — overrides global Impertio brand. Triggers on: branding, huisstijl, corporate identity, visual design, OpenAEC style.
user-invocable: false
---

# OpenAEC Foundation Brand Guidelines

> Source: https://github.com/OpenAEC-Foundation/OpenAEC_stijlbook
> This workspace skill overrides the global Impertio brand-guidelines skill.
> Open-Agents is an OpenAEC Foundation project.

## Identity

- Full name: **OpenAEC Foundation**
- Spelling: Always `OpenAEC` — never "Open AEC"
- Tagline: **Build free. Build together.**

## Color Palette

### Primary
| Token | Hex | Usage |
|-------|-----|-------|
| amber | #D97706 | Primary accent — buttons, links, borders. NEVER background. |
| deep-forge | #36363E | Dark surfaces |
| signal-orange | #EA580C | Hover, CTAs |
| warm-gold | #F59E0B | Highlights, terminal/live context |
| scaffold-gray | #A1A1AA | Muted text, borders |

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| night-build | #2A2A32 | Dark mode primary bg |
| blueprint-white | #FAFAF9 | Light mode bg |
| concrete | #F5F5F4 | Light cards/sections |

### Semantic
| Token | Hex |
|-------|-----|
| success / running | #16A34A |
| error | #DC2626 |
| warning | #F59E0B |
| info | #2563EB |

### Gradient
```
linear-gradient(90deg, #D97706 0%, #F59E0B 40%, #EA580C 100%)
```

### Color Rules
1. #D97706 NEVER as background — only accents/borders
2. Text on dark: #FAFAF9 or #F59E0B (not amber)
3. Text on light: #36363E (not amber)
4. WCAG AA 4.5:1 minimum

## Typography

| Role | Font | Weights |
|------|------|---------|
| Headings H1-H3 | Space Grotesk | 700 |
| Subheadings H4-H6 | Space Grotesk | 500 |
| Body / UI | Inter | 400, 500, 600 |
| Code / mono | JetBrains Mono | 400, 500 |
| Section labels | JetBrains Mono | 500 + uppercase + letter-spacing 0.1em |

Google Fonts:
- Space Grotesk: wght@500;700
- Inter: wght@400;500;600;700
- JetBrains Mono: wght@400;500

Rules: sentence case headings, max 3 weights per page, body max-width 70ch.

## Dashboard Theme (oa-cli/web themes.ts)

```ts
{
  id: 'openaec',
  name: 'OpenAEC',
  preview: { bg: '#2A2A32', sidebar: '#222228', accent: '#D97706' },
  vars: {
    '--color-oa-bg': '#2A2A32',
    '--color-oa-surface': '#36363E',
    '--color-oa-surface-hover': '#3E3E48',
    '--color-oa-sidebar': '#222228',
    '--color-oa-border': '#4A4A54',
    '--color-oa-border-light': '#404048',
    '--color-oa-text': '#FAFAF9',
    '--color-oa-text-muted': '#A1A1AA',
    '--color-oa-text-dim': '#666670',
    '--color-oa-accent': '#D97706',
    '--color-oa-accent-bg': '#2E2418',
    '--color-oa-accent-hover': '#EA580C',
    '--color-oa-terminal': '#F59E0B',
    '--color-oa-terminal-dim': '#D97706',
  }
}
```

Status: running=#16A34A, done=#16A34A, error=#DC2626, warning=#F59E0B, killed=#A1A1AA
Models: opus=#D97706, sonnet=#EA580C, haiku=#F59E0B, ollama=#16A34A

## Logo Assets

Local path: oa-cli/web/public/assets/logos/openaec/
- openaec-logo-amber-on-dark.svg  → default (dark header)
- openaec-logo-white-on-dark.svg  → alt dark
- openaec-logo-dark-on-light.svg  → light mode
- openaec-symbol-amber-on-dark.svg → favicon, collapsed sidebar
- openaec-symbol-transparent.svg   → overlays

## UI Patterns

- Active agent: amber left-border border-l-2 border-[#D97706]
- Live/running dot: pulsing #F59E0B
- Header accent strip: gradient amber→gold→orange
- Section labels: JetBrains Mono, uppercase, 0.75rem, #D97706
- Primary button: bg #D97706, hover #EA580C, text white
- Secondary button: border #D97706, text #D97706, transparent bg

---
OpenAEC Foundation — Build free. Build together. | CC BY-SA 4.0
