# Open PDF Studio — Research Analyse

**Datum:** 2026-03-08
**Repository:** https://github.com/OpenAEC-Foundation/open-pdf-studio
**Onderzocht door:** pdf-studio-researcher agent

---

## 1. Wat is Open PDF Studio?

Open PDF Studio is een **gratis, open-source PDF-editor en annotatieprogramma** gebouwd door de OpenAEC Foundation. Het project positioneert zich als een volledig alternatief voor commerciële PDF-editors zoals Adobe Acrobat of PDF-XChange, zonder abonnementen, telemetrie of kosten.

**Kernpropositie:**
- Gratis & open-source (LGPL-3.0)
- 20+ annotatiegereedschappen standaard inbegrepen
- Geen tracking of telemetrie
- Native desktop performance via Tauri/Rust
- Multi-platform: Windows, macOS, Linux, Android

**Repository stats (maart 2026):**
- 26 stars, 1 fork
- 43 open issues
- Aangemaakt: januari 2026 (relatief nieuw project!)
- Laatste update: 7 maart 2026 (actief onderhouden)
- Repository grootte: ~44 MB
- Versie: 1.23.0

---

## 2. Technische Stack

### Frontend
| Component | Technologie | Versie |
|-----------|-------------|--------|
| UI Framework | **SolidJS** | - |
| Build tool | **Vite** | 7.3.1 |
| PDF rendering | **PDF.js** (pdfjs-dist) | - |
| PDF manipulatie | **pdf-lib** | - |
| Internationalisatie | **i18next** + browser language detection | - |

### Backend/Desktop
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Desktop wrapper | **Tauri 2** | 2.10.2 |
| Systeemtaal | **Rust** | 1.77.2 (edition 2021) |
| TLS | **Rustls** via reqwest | - |

### Tauri Plugins gebruikt
- `tauri-plugin-dialog` — bestandsdialogen
- `tauri-plugin-fs` — bestandssysteem toegang
- `tauri-plugin-os` — OS-informatie
- `tauri-plugin-process` — processbeheer
- `tauri-plugin-shell` — shell-commando's
- `tauri-plugin-log` — logging
- `tauri-plugin-deep-link` — deep linking
- `tauri-plugin-single-instance` — éénmalige instantie
- `tauri-plugin-updater` — auto-updates (niet op Android)
- `tauri-plugin-opener` — URL openen

### JS-module structuur
De `js/` directory toont een duidelijke modulaire opzet:
```
js/
├── annotations/    # Annotatiegereedschappen
├── core/           # Kernfunctionaliteit
├── i18n/           # Vertalingen (39 talen!)
├── mobile/         # Mobiele aanpassingen
├── pdf/            # PDF rendering & verwerking
├── search/         # Zoekfunctionaliteit
├── solid/          # SolidJS componenten
├── stores/         # State management (SolidJS stores)
├── text/           # Tekstverwerking
├── tools/          # Gereedschapsimplementaties
├── ui/             # UI componenten
├── utils/          # Hulpfuncties
├── watermark/      # Watermerkfunctionaliteit
└── main.js         # Entry point
```

---

## 3. Features Overzicht

### Annotaties & Markup
- Tekst markeren (highlight)
- Vormen: rechthoeken, ellipsen, polygonen
- Vrij tekenen (freehand)
- Tekstvakken en callouts
- Sticky notes
- Stempels
- Afbeeldingen invoegen
- Multi-stroke handtekeningen
- Redactie (zwart maken van tekst)

### Paginabewerkingen
- Pagina's invoegen/verwijderen
- Paginabereiken extraheren
- Herordenen via thumbnails
- PDF's samenvoegen
- Pagina's roteren

### Meetgereedschappen (AEC-relevant!)
- Afstandsmeting
- Oppervlaktemeting
- Omtrekmeting
- Schaalcalibratie
- Object-snapping

### Geavanceerde functies
- Watermerken met transparantieregeling
- Kop- en voetteksten met variabelen
- Interactief invullen van formulieren
- Afdrukken met voorvertoning
- Batch export als PNG/JPEG op verschillende DPI's

### UI
- Multi-tab bewerken
- 10-paneel linkerzijbalk:
  - Thumbnails
  - Bladwijzers
  - Annotaties
  - Handtekeningen
  - Lagen
  - Formulieren
  - (en meer)
- Zoek/vind functionaliteit
- Multi-select uitlijngereedschappen
- Configureerbare snapping

### Thema's & Lokalisatie
- 5 thema's: Donker, Licht, Blauw, Hoog Contrast, Systeem
- 39 talen inclusief RTL-talen
- Per-annotatie standaard stijlen

---

## 4. Architectuur — Interessante Patronen

### 4.1 Tauri 2 als Desktop Wrapper
Tauri is een Rust-gebaseerd alternatief voor Electron. Voordelen:
- **Veel kleiner installatiebestand** (gebruikt systeem WebView i.p.v. bundled Chromium)
- **Betere performance** (native Rust backend)
- **Betere security** (Rust's memory safety)
- Plugins systeem via officiële `tauri-plugin-*` crates

Dit patroon is interessant voor Open-Agents als we desktop apps willen bouwen.

### 4.2 SolidJS als Frontend Framework
SolidJS is een alternatief voor React met:
- **Fijnmazige reactiviteit** (geen virtual DOM)
- **Betere performance** dan React in veel benchmarks
- **Kleiner bundel formaat**
- Stores voor state management (vergelijkbaar met Zustand/Jotai)

### 4.3 Hybride PDF-verwerking
Het project gebruikt twee PDF-bibliotheken tegelijk:
- **PDF.js** (Mozilla): voor rendering en weergave
- **pdf-lib**: voor manipulatie (schrijven, aanpassen)

Dit is een slim patroon: PDF.js is excellent voor rendering maar minder geschikt voor schrijven. pdf-lib is goed in manipulatie maar minder in rendering.

### 4.4 Modulaire JS-structuur
De duidelijke scheiding in `js/` mappen (annotations/, tools/, stores/, ui/, etc.) toont een **feature-based modulaire architectuur**. Elk domein heeft zijn eigen map.

### 4.5 Multi-platform via één codebase
Hetzelfde project draait op:
- Windows (EXE installer)
- macOS (DMG universal binary)
- Linux (Snap, DEB, AppImage)
- Android (APK)

Dit wordt mogelijk gemaakt door Tauri's cross-platform capabilities.

### 4.6 Internationalisatie op grote schaal
39 talen (inclusief RTL) is indrukwekkend voor een jong project. Gebruik van `i18next` met `i18next-browser-languagedetector`.

---

## 5. Relatie met OpenAEC Foundation

Dit project komt van de **OpenAEC Foundation** — dezelfde organisatie die relevant is voor de AEC-sector (Architecture, Engineering, Construction). De **meetgereedschappen** (afstand, oppervlakte, omtrek, schaalcalibratie) zijn specifiek nuttig voor:
- Architecten die tekeningen reviewen
- Ingenieurs die afmetingen controleren
- Aannemers die hoeveelheden schatten

Open-Agents heeft al connecties met de AEC-sector. Dit project is dus direct relevant voor onze doelgroep.

---

## 6. Open Issues — Inzichten

43 open issues per maart 2026, waaronder:
- **Bugs:** zoom glitch, freehand tekenen, Ubuntu 24.04 launch probleem
- **UI verbeteringen:** navigatieknoppen, marges, schermkwaliteit
- **Feature requests:** diverse

Het project is **actief in gebruik** maar nog jong (jan 2026). Er is ruimte voor contributies.

---

## 7. Wat Kunnen We Leren voor Open-Agents?

### 7.1 Tech Stack Keuzes
- **Tauri 2 + Rust** als we desktop apps willen bouwen (beter dan Electron)
- **SolidJS** als alternatief voor React (betere performance, kleiner)
- **Hybride PDF-aanpak** (PDF.js + pdf-lib) voor PDF-gerelateerde agents

### 7.2 Architectuurpatronen
- **Feature-based modulaire structuur** in JS — goed voorbeeld voor agent-code
- **Plugin-systeem** (Tauri plugins) — inspiratie voor Open-Agents plugin-architectuur
- **Multi-platform single codebase** — patroon voor agent-tools die op meerdere platforms draaien

### 7.3 Open Source Strategie
- Vrij nieuw project (jan 2026) met al 26 stars en 43 issues = actieve community
- LGPL-3.0 licentie: kan gebruikt worden in closed-source projecten mits de library zelf open blijft
- Geen homepage of docs site nog — kans voor contributies

### 7.4 AEC Sector Inzichten
- Meetgereedschappen zijn een kernbehoefte in AEC
- PDF-annotatie is een primaire workflow voor architecten/ingenieurs
- Multi-taal + RTL is belangrijk voor internationale AEC-projecten

---

## 8. Concrete Ideeën — Wat Kunnen We DOEN?

### 8.1 Agent: PDF-Annotatie Analyzer
**Idee:** Een Open-Agents agent die PDF-annotaties uitleest en analyseert.
- Gebruik pdf-lib om annotaties te extraheren
- Agent analyseert commentaar in bouwkundige tekeningen
- Output: gestructureerde lijst van issues/opmerkingen
- **Relevantie:** Direct bruikbaar voor AEC-workflows

### 8.2 Contributie aan Open PDF Studio
**Idee:** Bijdragen aan het project via issues/PRs.
- Ubuntu 24.04 launch probleem (Issue #174) oplossen
- Documentatie verbeteren (README uitbreiden)
- Feature: CLI-modus voor batch PDF-verwerking
- **Relevantie:** Zichtbaarheid voor OpenAEC Foundation

### 8.3 Agent: PDF Batch Processor
**Idee:** Open-Agents agent die bulk PDF-bewerkingen uitvoert.
- Batch watermerken toevoegen
- Bulk pagina-extractie
- Geautomatiseerde stempel-plaatsing
- Gebaseerd op dezelfde tech stack (pdf-lib)
- **Relevantie:** Agenten kunnen dit autonoom uitvoeren

### 8.4 Integration: Open PDF Studio als Agent Tool
**Idee:** Open PDF Studio aanroepen als command-line tool vanuit Open-Agents.
- Als de CLI-modus bestaat/gebouwd wordt: agents kunnen PDFs verwerken
- Geen code duplicatie: gebruik bestaande open-source tool
- **Relevantie:** Tool-use patroon voor agents

### 8.5 Research: Tauri voor Open-Agents Desktop UI
**Idee:** Verken Tauri als basis voor een eventuele Open-Agents desktop applicatie.
- Tauri 2 is modern en actief onderhouden
- SolidJS is sneller dan React
- Rust backend past bij security-bewuste agents
- **Relevantie:** Als we ooit een native desktop UI willen

### 8.6 Fork: PDF Studio als Agent-Enabled Tool
**Idee:** Fork het project en voeg agent-integratie toe.
- REST API endpoint toevoegen voor externe aansturing
- Agents kunnen PDF's openen, annoteren, en opslaan via API
- Gebruik de bestaande codebase als basis
- **Relevantie:** Volledige agent-native PDF-editor

---

## 9. Samenvatting & Prioritering

| Idee | Moeite | Impact | Prioriteit |
|------|--------|--------|-----------|
| PDF-Annotatie Analyzer agent | Laag | Hoog | **⭐⭐⭐** |
| Contributie aan Issues | Laag | Medium | **⭐⭐** |
| PDF Batch Processor agent | Medium | Hoog | **⭐⭐⭐** |
| Tauri onderzoek voor desktop UI | Medium | Medium | **⭐⭐** |
| CLI-integratie als agent tool | Hoog | Hoog | **⭐⭐** |
| Fork met agent-integratie | Zeer hoog | Zeer hoog | **⭐ (langetermijn)** |

**Aanbeveling voor korte termijn:**
1. Bouw een **PDF Batch Processor agent** op basis van pdf-lib (dezelfde tech als Open PDF Studio)
2. Verken **contributie aan Issues** om zichtbaarheid te krijgen bij OpenAEC Foundation
3. Documenteer Tauri als optie voor toekomstige desktop tools

---

## 10. Technische Bronnen

- **Repository:** https://github.com/OpenAEC-Foundation/open-pdf-studio
- **README:** https://raw.githubusercontent.com/OpenAEC-Foundation/open-pdf-studio/main/README.md
- **API Info:** https://api.github.com/repos/OpenAEC-Foundation/open-pdf-studio
- **Tauri docs:** https://tauri.app/
- **SolidJS docs:** https://solidjs.com/
- **pdf-lib:** https://pdf-lib.js.org/
- **PDF.js:** https://mozilla.github.io/pdf.js/

---

*Analyse uitgevoerd door pdf-studio-researcher agent | Open-Agents platform | 2026-03-08*
