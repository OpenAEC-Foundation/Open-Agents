# Design Spec — Open Agents Web UI

Gebaseerd op analyse van https://opencompany246.nl (Tailwind CSS + React SPA, Inter font).

---

## 1. Kleuren

### Brand CSS Variabelen (`:root`)

| Variabele | RGB Waarde | Hex | Gebruik |
|-----------|-----------|-----|---------|
| `--brand-primary` | `26 42 58` | `#1A2A3A` | Primaire kleur, headings, nav achtergrond |
| `--brand-primary-light` | `45 67 86` | `#2D4356` | Hover states op primary |
| `--brand-primary-dark` | `16 28 40` | `#101C28` | Diepere accenten |
| `--brand-accent` | `255 107 53` | `#FF6B35` | CTA buttons, highlights, badges |
| `--brand-accent-dark` | `229 90 42` | `#E55A2A` | Hover op accent |
| `--brand-accent-light` | `255 143 107` | `#FF8F6B` | Lichtere accent tints |
| `--brand-bg` | `249 250 251` | `#F9FAFB` | Pagina achtergrond |
| `--brand-surface` | `255 255 255` | `#FFFFFF` | Card/panel achtergrond |
| `--brand-surface-hover` | `241 243 245` | `#F1F3F5` | Hover op surfaces |
| `--brand-muted` | `235 237 240` | `#EBEDF0` | Disabled/muted achtergronden |
| `--brand-border` | `209 213 219` | `#D1D5DB` | Borders (= Tailwind gray-300) |
| `--brand-ring` | `91 122 148` | `#5B7A94` | Focus rings |
| `--brand-fg` | `26 42 58` | `#1A2A3A` | Primaire tekst |
| `--brand-fg-muted` | `107 123 141` | `#6B7B8D` | Secundaire/muted tekst |
| `--brand-fg-inverted` | `249 250 251` | `#F9FAFB` | Tekst op donkere achtergrond |
| `--brand-success` | `22 163 74` | `#16A34A` | Succes states |
| `--brand-warning` | `217 119 6` | `#D97706` | Waarschuwingen |
| `--brand-error` | `220 38 38` | `#DC2626` | Error states |
| `--brand-info` | `37 99 235` | `#2563EB` | Informatieve states |

### Aanvullende Kleurcodes

| Kleur | Hex | Gebruik |
|-------|-----|---------|
| Blauw primair | `#0082C9` | Alternatief blauw accent (gradients, shadows) |
| Blauw helder | `#0085E3` | Lichtere variant van blauw |
| Blauw vivid | `#067EFB` | Nog levendigere variant |
| Oranje (oc-orange) | `#FF6B35` | Brand oranje = accent |
| Navy (oc-navy) | `#1A2A3A` | Brand navy = primary |
| Navy light | `#2D4356` | Gradient eindpunt |

### Kleur Toepassingsregels

```
Achtergrond pagina:     bg-brand-bg (#F9FAFB)
Achtergrond cards:      bg-brand-surface (#FFFFFF) of bg-white
Achtergrond nav:        bg-brand-primary (#1A2A3A) — donker navy
Tekst primair:          text-brand-fg (#1A2A3A)
Tekst secundair:        text-brand-fg-muted (#6B7B8D) of text-gray-500
Tekst op donker:        text-brand-fg-inverted (#F9FAFB) of text-white
CTA / Accent:           bg-brand-accent (#FF6B35)
CTA hover:              bg-brand-accent-dark (#E55A2A)
Borders:                border-brand-border (#D1D5DB) of border-gray-200
Focus ring:             ring-brand-accent (#FF6B35) of ring-brand-ring (#5B7A94)
```

---

## 2. Typografie

### Font Family

```css
font-family: Inter, system-ui, sans-serif;
```

Geladen via Google Fonts: `Inter:wght@400;500;600;700`

Monospace (code): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`

### Font Sizes (Tailwind schaal)

| Class | Size | Gebruik |
|-------|------|---------|
| `text-xs` | `0.75rem` (12px) | Labels, badges, meta-info |
| `text-sm` | `0.875rem` (14px) | Secundaire tekst, tabel cellen |
| `text-base` | `1rem` (16px) | Body tekst |
| `text-lg` | `1.125rem` (18px) | Subtitels, card titels |
| `text-xl` | `1.25rem` (20px) | Sectie koppen |
| `text-2xl` | `1.5rem` (24px) | H3 equivalent |
| `text-3xl` | `1.875rem` (30px) | H2 equivalent |
| `text-4xl` | `2.25rem` (36px) | H1 / hero tekst |
| `text-5xl` | `3rem` (48px) | Grote hero koppen |
| `text-6xl` | `3.75rem` (60px) | Zeer grote display tekst |

### Font Weights

| Weight | Class | Gebruik |
|--------|-------|---------|
| 400 | `font-normal` | Body tekst |
| 500 | `font-medium` | Labels, nav items, subtitels |
| 600 | `font-semibold` | Card titels, buttons, koppen |
| 700 | `font-bold` | Hero tekst, belangrijke koppen |

### Line Height

```css
html { line-height: 1.5; }
```

Standaard Tailwind line-heights worden gebruikt via de text-size classes.

---

## 3. Spacing Systeem

### Tailwind Spacing Schaal (in gebruik)

| Waarde | rem | px | Veelgebruikt voor |
|--------|-----|------|-------------------|
| `0.5` | 0.125rem | 2px | Micro spacing |
| `1` | 0.25rem | 4px | Inline spacing |
| `1.5` | 0.375rem | 6px | Kleine gaps |
| `2` | 0.5rem | 8px | Padding small, gaps |
| `2.5` | 0.625rem | 10px | Button padding-y |
| `3` | 0.75rem | 12px | Card padding small |
| `4` | 1rem | 16px | Standaard padding |
| `6` | 1.5rem | 24px | Sectie spacing |
| `8` | 2rem | 32px | Grote spacing |
| `12` | 3rem | 48px | Sectie gaps |

### Container Breedtes

| Breakpoint | Max Width |
|------------|-----------|
| sm (640px) | `640px` |
| md (768px) | `768px` |
| lg (1024px) | `1024px` |
| xl (1280px) | `1280px` |
| 2xl (1536px) | `1536px` |

Custom max-widths in gebruik:
- `max-w-7xl` (80rem / 1280px) — meest gebruikte content container
- `max-w-[1400px]` — brede layouts
- `max-w-[1600px]` — volledige breedte layouts
- `max-w-4xl` (56rem / 896px) — smalle content
- `max-w-[620px]` — formulieren / smalle content

### Gap Systeem

Meest gebruikte gaps: `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).

---

## 4. Component Specs

### Cards

```css
/* Standaard card */
.card {
  background: white;                      /* bg-white */
  border: 1px solid #D1D5DB;             /* border border-gray-300 */
  border-radius: 0.75rem;                /* rounded-xl */
  padding: 1.5rem;                       /* p-6 */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); /* shadow-sm */
  transition: all 0.2s ease;
}

/* Card hover */
.card:hover {
  box-shadow: 0 10px 15px rgba(0,0,0,0.1); /* shadow-lg */
  border-color: rgb(255 107 53 / 0.2);     /* border-brand-accent/20 */
}
```

Tailwind equivalent:
```
bg-white border border-gray-300 rounded-xl p-6 shadow-sm
hover:shadow-lg hover:border-brand-accent/20 transition-all duration-200
```

### Buttons

```css
/* Primary button (accent/CTA) */
.btn-primary {
  background: #FF6B35;                       /* bg-brand-accent */
  color: white;
  font-weight: 600;                          /* font-semibold */
  padding: 0.625rem 1.5rem;                  /* py-2.5 px-6 */
  border-radius: 0.5rem;                     /* rounded-lg */
  box-shadow: 0 4px 6px rgba(255,107,53,0.25); /* shadow-md shadow-brand-accent/25 */
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #E55A2A;                       /* bg-brand-accent-dark */
  box-shadow: 0 10px 15px rgba(255,107,53,0.3); /* shadow-lg shadow-brand-accent/30 */
  transform: translateY(-1px);
}

/* Secondary button */
.btn-secondary {
  background: white;
  color: #1A2A3A;                            /* text-brand-primary */
  border: 1px solid #D1D5DB;                 /* border border-gray-300 */
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;                     /* rounded-lg */
  font-weight: 500;                          /* font-medium */
}

/* Ghost / text button */
.btn-ghost {
  background: transparent;
  color: #FF6B35;                            /* text-brand-accent */
  font-weight: 500;
  padding: 0.5rem 1rem;
}
```

Tailwind:
```
/* Primary */
bg-brand-accent text-white font-semibold py-2.5 px-6 rounded-lg
shadow-md shadow-brand-accent/25 hover:bg-brand-accent-dark
hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5
transition-all duration-200

/* Secondary */
bg-white text-brand-primary border border-gray-300 font-medium
py-2.5 px-6 rounded-lg hover:bg-gray-50 transition-all duration-200
```

### Badges / Pills

```css
.badge {
  font-size: 0.75rem;                /* text-xs */
  font-weight: 500;                  /* font-medium */
  padding: 0.25rem 0.75rem;          /* py-1 px-3 */
  border-radius: 9999px;             /* rounded-full */
  display: inline-flex;
  align-items: center;
}

/* Varianten */
.badge-accent {
  background: rgb(255 107 53 / 0.1);  /* bg-brand-accent/10 */
  color: #FF6B35;                     /* text-brand-accent */
}

.badge-success {
  background: #DCFCE7;               /* bg-green-100 */
  color: #16A34A;                    /* text-green-600 */
}

.badge-info {
  background: #DBEAFE;               /* bg-blue-100 */
  color: #2563EB;                    /* text-blue-600 */
}

.badge-warning {
  background: #FFFBEB;               /* bg-amber-50 */
  color: #D97706;                    /* text-amber-600 */
}

.badge-error {
  background: #FEF2F2;               /* bg-red-50 */
  color: #DC2626;                    /* text-red-600 */
}
```

### Navigatie

```css
/* Top navbar - donker navy */
.navbar {
  background: #1A2A3A;              /* bg-brand-primary (oc-navy) */
  color: #F9FAFB;                   /* text-brand-fg-inverted */
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 0 1.5rem;               /* px-6 */
}

.nav-link {
  color: rgba(255,255,255,0.8);     /* text-white/80 */
  font-weight: 500;                 /* font-medium */
  font-size: 0.875rem;             /* text-sm */
  padding: 0.5rem 0.75rem;         /* py-2 px-3 */
  border-radius: 0.5rem;           /* rounded-lg */
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: white;
  background: rgba(255,255,255,0.1); /* bg-white/10 */
}

.nav-link.active {
  color: #FF6B35;                    /* text-brand-accent */
}
```

### Tabellen / Lijsten

```css
/* Tabel */
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 0.75rem;              /* text-xs */
  font-weight: 600;                /* font-semibold */
  color: #6B7B8D;                  /* text-brand-fg-muted */
  text-transform: uppercase;
  letter-spacing: 0.05em;          /* tracking-wider */
  padding: 0.75rem 1rem;           /* py-3 px-4 */
  border-bottom: 1px solid #E5E7EB; /* border-b border-gray-200 */
}

.table td {
  padding: 0.75rem 1rem;           /* py-3 px-4 */
  font-size: 0.875rem;            /* text-sm */
  border-bottom: 1px solid #F3F4F6; /* border-b border-gray-100 */
  color: #1A2A3A;                  /* text-brand-fg */
}

.table tr:hover td {
  background: #F9FAFB;            /* bg-gray-50 */
}
```

### Input Fields

```css
.input {
  width: 100%;
  padding: 0.625rem 0.75rem;       /* py-2.5 px-3 */
  border: 1px solid #D1D5DB;       /* border border-gray-300 */
  border-radius: 0.5rem;           /* rounded-lg */
  font-size: 0.875rem;            /* text-sm */
  color: #1A2A3A;
  background: white;
  transition: all 0.15s ease;
}

.input:focus {
  border-color: #FF6B35;           /* focus:border-brand-accent */
  box-shadow: 0 0 0 3px rgba(255,107,53,0.1); /* focus:ring-2 ring-brand-accent/10 */
  outline: none;
}

.input::placeholder {
  color: #9CA3AF;                  /* placeholder:text-gray-400 */
}
```

---

## 5. Do's en Don'ts

### Do's

- **Gebruik Inter als enige font** — consistent door de hele app
- **Gebruik het brand kleurensysteem** via CSS variabelen (`--brand-*`)
- **Gebruik `rounded-lg` tot `rounded-xl`** voor componenten (8-12px)
- **Gebruik `rounded-full`** voor badges en pills
- **Gebruik subtiele shadows** (`shadow-sm`, `shadow-md`) — nooit `shadow-2xl` als default
- **Donkere navy navbar** (`#1A2A3A`) met witte tekst
- **Oranje accent** (`#FF6B35`) alleen voor CTA's en highlights — spaarzaam
- **Ruime whitespace** — gebruik `p-6` voor cards, `gap-6` tot `gap-8` tussen secties
- **Hover transitions** — altijd `transition-all duration-200`
- **Focus rings** — accent kleur ring bij focus states
- **Gradient achtergronden** — subtiel van primary naar accent in hero secties

### Don'ts

- **Geen felle kleuren als grote vlakken** — oranje accent is voor kleine elementen
- **Geen zware shadows** — houd het subtiel en clean
- **Geen border-radius > `rounded-2xl`** op reguliere componenten
- **Geen inline tekst kleuren** — gebruik altijd de brand variabelen
- **Geen andere fonts** — Inter only, geen serif, geen display fonts
- **Geen pure zwart** (`#000`) voor tekst — gebruik `#1A2A3A` (brand-fg)
- **Geen grote tekst boven `text-5xl`** buiten hero secties
- **Geen compact design** — de site ademt witruimte

---

## 6. Design Principes

### Witruimte
Veel witruimte. Secties zijn ruim uit elkaar, cards hebben `p-6`, containers gebruiken `max-w-7xl` met ruime padding.

### Border Radius
- Kleine elementen (badges): `rounded-full` (9999px)
- Buttons, inputs: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px) tot `rounded-2xl` (16px)
- Modals: `rounded-2xl` (16px)

### Shadows
Subtiel. Default is `shadow-sm`, hover verhoogt naar `shadow-lg`. Accent-gekleurde shadows (`shadow-brand-accent/25`) voor CTA buttons.

### Animaties & Transitions
- `transition-all duration-200 ease-in-out` — standaard voor interactieve elementen
- `transition-colors duration-150` — voor snelle kleurwisselingen
- `duration-300` tot `duration-500` — voor grotere animaties (modals, dropdowns)
- Hover transforms: `hover:-translate-y-0.5` op buttons voor subtiel lift effect

### Gradients
Hero secties gebruiken gradients van `oc-navy` (#1A2A3A) naar `oc-navy-light` (#2D4356), soms met accent kleur als subtiele overlay.

---

## 7. Tailwind Config Aanbeveling

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'oc-navy': '#1A2A3A',
        'oc-navy-light': '#2D4356',
        'oc-navy-dark': '#101C28',
        'oc-orange': '#FF6B35',
        'oc-orange-dark': '#E55A2A',
        'oc-orange-light': '#FF8F6B',
        'oc-blue': '#0082C9',
        'oc-blue-light': '#0085E3',
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          'primary-light': 'rgb(var(--brand-primary-light) / <alpha-value>)',
          'primary-dark': 'rgb(var(--brand-primary-dark) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          'accent-dark': 'rgb(var(--brand-accent-dark) / <alpha-value>)',
          'accent-light': 'rgb(var(--brand-accent-light) / <alpha-value>)',
          bg: 'rgb(var(--brand-bg) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          'surface-hover': 'rgb(var(--brand-surface-hover) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
          ring: 'rgb(var(--brand-ring) / <alpha-value>)',
          fg: 'rgb(var(--brand-fg) / <alpha-value>)',
          'fg-muted': 'rgb(var(--brand-fg-muted) / <alpha-value>)',
          'fg-inverted': 'rgb(var(--brand-fg-inverted) / <alpha-value>)',
          success: 'rgb(var(--brand-success) / <alpha-value>)',
          warning: 'rgb(var(--brand-warning) / <alpha-value>)',
          error: 'rgb(var(--brand-error) / <alpha-value>)',
          info: 'rgb(var(--brand-info) / <alpha-value>)',
        },
      },
    },
  },
}
```

### CSS Variabelen (in `index.css` of `globals.css`)

```css
:root {
  --brand-primary: 26 42 58;
  --brand-primary-light: 45 67 86;
  --brand-primary-dark: 16 28 40;
  --brand-accent: 255 107 53;
  --brand-accent-dark: 229 90 42;
  --brand-accent-light: 255 143 107;
  --brand-bg: 249 250 251;
  --brand-surface: 255 255 255;
  --brand-surface-hover: 241 243 245;
  --brand-muted: 235 237 240;
  --brand-border: 209 213 219;
  --brand-ring: 91 122 148;
  --brand-fg: 26 42 58;
  --brand-fg-muted: 107 123 141;
  --brand-fg-inverted: 249 250 251;
  --brand-success: 22 163 74;
  --brand-warning: 217 119 6;
  --brand-error: 220 38 38;
  --brand-info: 37 99 235;
}
```

---

## 8. Verschil Huidige UI vs Target

| Aspect | Huidige UI (verwacht) | Target (OpenCompany246) |
|--------|----------------------|------------------------|
| Font | System fonts / willekeurig | Inter (400/500/600/700) |
| Primary kleur | Ongedefinieerd | Navy #1A2A3A |
| Accent kleur | Ongedefinieerd | Oranje #FF6B35 |
| Achtergrond | Wit | Lichtgrijs #F9FAFB |
| Cards | Plat of inconsistent | Witte cards, shadow-sm, rounded-xl, border |
| Buttons | Basis styling | Accent shadow, lift hover, rounded-lg |
| Nav | Onbekend | Sticky donker navy met witte tekst |
| Spacing | Mogelijk te compact | Ruim: p-6 cards, gap-6/8 secties |
| Shadows | Geen of inconsistent | Subtiel: sm default, lg hover |
| Borders | Hard of geen | 1px gray-300, soms accent op hover |
| Color system | Hardcoded | CSS variabelen met brand tokens |
| Focus states | Browser default | Custom accent-colored rings |
