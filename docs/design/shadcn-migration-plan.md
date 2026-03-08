# shadcn/ui Migratie Plan — Open-Agents Web UI

**Datum:** 2026-03-08
**Auteur:** ui-architect agent
**Status:** Aanbeveling gereed

---

## 1. Compatibiliteitscheck

### Stack
| Component | Versie | shadcn/ui compatibel? |
|-----------|--------|----------------------|
| React | ^19.2.4 | ✅ Volledig supported |
| Vite | ^7.3.1 | ✅ Primaire bundler voor shadcn |
| Tailwind CSS | ^4.1.0 | ✅ Ondersteund vanaf shadcn CLI v0.9+ (dec 2024) |
| @tailwindcss/vite | ^4.1.0 | ✅ Supported (geen tailwind.config.js nodig) |
| TypeScript | ^5.9.3 | ✅ |
| lucide-react | ^0.511.0 | ✅ shadcn gebruikt ook lucide-react |

### Technische Bevindingen

**Tailwind v4 setup (bevestigd):**
```css
/* index.css gebruikt Tailwind v4 syntax: */
@import "tailwindcss";
@theme { /* CSS custom properties */ }
```

**shadcn/ui + Tailwind v4:** De shadcn CLI versie 2.x (latest) ondersteunt Tailwind v4 volledig. In plaats van `tailwind.config.js` schrijft shadcn variabelen direct in het CSS `@theme` blok — precies hoe dit project al is ingericht.

**Aandachtspunten:**
1. **Path alias vereist**: shadcn verwacht `@/` alias. Huidige `vite.config.ts` heeft dit nog niet.
2. **CSS variabelen co-existentie**: shadcn voegt `--background`, `--foreground`, `--primary` etc. toe. De bestaande `oa-*` variabelen blijven intact maar moeten gemapt worden.
3. **Dark mode**: shadcn's `.dark` class coëxisteert met de bestaande all-dark setup.

---

## 2. Aanbeveling: Volledige shadcn Installatie ✅

**Reden**: Handmatig overnemen is trager, foutgevoeliger en mist updates. De CLI ondersteunt Tailwind v4 + Vite natively. De enige aanpassing is de path alias en CSS variabelen mapping.

---

## 3. Exacte Installatiestappen

### Stap 1: Path alias configureren

**`vite.config.ts`** — voeg `resolve.alias` toe:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ... rest van config
});
```

**`tsconfig.json`** — voeg paths toe:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Stap 2: shadcn CLI initialiseren

```bash
cd /mnt/c/Users/Freek\ Heijting/Documents/GitHub/Open-Agents/oa-cli/web
npx shadcn@latest init
```

Bij de CLI prompts:
- **Style**: New York (schoner, minder rounded, past bij de dark terminal aesthetic)
- **Base color**: Neutral (niet Slate — Neutral past beter bij #0a0a0a achtergrond)
- **CSS variables**: Yes

### Stap 3: CSS variabelen mapping

Na `init` voegt shadcn variabelen toe aan `index.css`. Map ze op de bestaande Impertio kleuren:

```css
@layer base {
  :root {
    /* Map shadcn vars to Impertio dark theme */
    --background: 0 0% 4%;          /* #0a0a0a */
    --foreground: 0 0% 94%;         /* #f0f0f0 */
    --card: 0 0% 10%;               /* #1a1a1a */
    --card-foreground: 0 0% 94%;
    --popover: 0 0% 10%;
    --popover-foreground: 0 0% 94%;
    --primary: 25 100% 50%;         /* #ff6b00 Impertio orange */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 18%;          /* #2d2d2d */
    --secondary-foreground: 0 0% 94%;
    --muted: 0 0% 13%;
    --muted-foreground: 0 0% 53%;   /* #888888 */
    --accent: 25 100% 50%;          /* #ff6b00 */
    --accent-foreground: 0 0% 100%;
    --destructive: 354 70% 54%;     /* #dc3545 */
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 18%;             /* #2d2d2d */
    --input: 0 0% 18%;
    --ring: 25 100% 50%;            /* orange focus ring */
    --radius: 0.375rem;
  }
}
```

### Stap 4: Eerste componenten installeren

```bash
# Prioriteit 1: Core UI primitives
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add card

# Prioriteit 2: Data & interactie
npx shadcn@latest add table
npx shadcn@latest add dialog

# Prioriteit 3: Navigatie
npx shadcn@latest add tabs
npx shadcn@latest add select

# Later
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add sidebar
```

### Stap 5: Bestaande components migreren

Vervang custom implementaties stapsgewijs. Prioriteer componenten die op meerdere plekken voorkomen (Button, Badge voor agent status).

---

## 4. Component Prioriteitsmatrix

| Component | Prioriteit | Reden |
|-----------|-----------|-------|
| **Badge** | 🔴 Hoog | Agent status (running/done/failed) zit overal |
| **Button** | 🔴 Hoog | Consistente interactie-elementen |
| **Table** | 🔴 Hoog | Agent lijst, pipeline views |
| **Dialog** | 🟡 Middel | Kill confirmations, agent details |
| **Tabs** | 🟡 Middel | Navigatie tussen views |
| **Card** | 🟡 Middel | Agent cards, stat panels |
| **Select** | 🟢 Laag | Model selector, filter dropdowns |
| **Sidebar** | 🟢 Laag | Navigatie sidebar (complexer, later) |
| **Input/Textarea** | 🟢 Laag | Formulieren, prompt input |

---

## 5. Badge Status Mapping (Concrete implementatie)

```tsx
// Vervangt custom status badges
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  running: "default",    // orange (--primary)
  done: "secondary",
  failed: "destructive",
  timeout: "outline",
  killed: "secondary",
} as const;

<Badge variant={statusVariant[agent.status]}>
  {agent.status}
</Badge>
```

Voor de groene `running` kleur: voeg een custom variant toe in `badge.tsx`:
```tsx
// In components/ui/badge.tsx, voeg toe aan variants:
running: "bg-[#00ff88] text-black hover:bg-[#00ff88]/80",
```

---

## 6. Tijdsinschatting

| Fase | Taak | Tijd |
|------|------|------|
| Setup | Path alias + init + CSS mapping | 1-2 uur |
| Core | Button + Badge + Card installeren en integreren | 2-3 uur |
| Data | Table component migratie (agent list) | 2-4 uur |
| Interactie | Dialog + Tabs | 2-3 uur |
| Navigatie | Sidebar + NavigationMenu | 4-6 uur |
| **Totaal** | | **11-18 uur** |

Bij gefaseerde aanpak (1-2 componenten per sprint) is dit goed beheersbaar.

---

## 7. Risico's en Mitigatie

| Risico | Kans | Mitigatie |
|--------|------|-----------|
| shadcn CSS conflicteert met `oa-*` vars | Laag | Eigen vars leven in `@theme {}`, shadcn vars in `:root` — gescheiden namespaces |
| Tauri WebKit Safari-compatibiliteit | Middel | Test op `safari14` target; shadcn gebruikt standaard CSS die breed supported is |
| Bestaande custom components breken | Laag | Stapsgewijze migratie, niet big-bang |
| font-family overschreven | Laag | Shadcn raakt `--font-sans` niet aan als je Montserrat al definieert in `@theme` |

---

## Conclusie

**Aanbeveling: Voer volledige shadcn/ui installatie uit.**

De stack (React 19 + Vite + Tailwind v4) is volledig compatible. De enige voorbereiding is de `@` path alias. De bestaande Impertio dark theme variabelen passen naadloos in shadcn's variabele systeem. Geschatte setup tijd: 1-2 uur. Daarna direct productief met de beste UI componenten van het ecosysteem.
