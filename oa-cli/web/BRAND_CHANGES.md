# Impertio Brand Implementation — Changelog

**Date:** 2026-03-11
**Agent:** oa-brand

## Summary

Applied Impertio Studio's official brand as the default theme for the Open-Agents React web UI.

---

## Files Changed

### `src/index.css`
- Replaced Google Fonts import: `Inter` → `Montserrat` (weights 400–900)
- Changed `--font-sans` from `"Inter"` to `"Montserrat"`
- Updated `@theme` and `:root` default tokens to Impertio brand values:
  - Background: `#0a0a0a` (Obsidian Black)
  - Surface: `#141414` (Carbon)
  - Accent: `#ff6b00` (Electric Orange)
  - Text: `#f0f0f0` (Off-white)
- Added terminal color tokens:
  - `--color-oa-terminal: #00ff88` (Matrix Green)
  - `--color-oa-terminal-dim: #00cc6a` (Terminal Green)
- Updated status colors: `--color-status-running` → `#00ff88` (Matrix Green)
- Updated model colors: opus=`#ff6b00`, sonnet=`#ff8c00`, haiku=`#ffaa00`, ollama=`#00ff88`

### `src/themes.ts`
- Changed `DEFAULT_THEME_ID` from `'light'` to `'impertio'`
- Extended Impertio theme vars with:
  - `--color-oa-terminal: #00ff88`
  - `--color-oa-terminal-dim: #00cc6a`
  - `--color-status-running: #00ff88`
  - `--color-model-opus: #ff6b00`
  - `--color-model-sonnet: #ff8c00`
  - `--color-model-haiku: #ffaa00`
  - `--color-model-ollama: #00ff88`
- All other themes (light, dark, nord, slate, ocean) preserved unchanged

### `src/stores/agentStore.ts`
- `statusColor('running')`: `#22d3ee` → `#00ff88` (Matrix Green)

---

## Brand Principles Applied

| Principle | Implementation |
|-----------|---------------|
| Dark-first | Near-black `#0a0a0a` as default background |
| Orange as accent | `#ff6b00` only on CTA, active states, key highlights |
| Matrix Green for live/running | `#00ff88` on all running/active indicators |
| Montserrat typography | Primary font for all UI text |
| JetBrains Mono | Retained for code/terminal contexts |
