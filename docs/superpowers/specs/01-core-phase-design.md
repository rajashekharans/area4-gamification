# Phase 1 Design — Core: skeleton, state, scoring engine

**Parent design system:** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED — all tokens, data model, formulas defined there)
**Plan reference:** `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` Phase 1, Tasks 1.1–1.3

## Phase-specific decisions

### Internal file layout of index.html

Single file, four ordered regions so later phases append predictably:

1. `<head>`: meta viewport, title, `<style>` — `:root` token block first, then base/reset, then component classes in A4 Kit order (AppShell → ClubCard → … as added by later phases).
2. `<body>`: AppShell markup — `<header class="app-header">`, `<main id="screen">`, `<nav class="tab-bar">`.
3. `<script defer src>` Chart.js CDN (present from Phase 1 even though used in Phase 4 — keeps the head stable).
4. Inline `<script>` IIFE, ordered: `// === CORE ===` (DEFAULT_STATE, loadState, saveState, computeScores, movementVs, pure helpers — no DOM access) then `// === UI ===` (render dispatcher, screen renderers, components). Pure core exposed as `window.A4 = { computeScores, movementVs, parseCsv: …later, DEFAULT_STATE, … }` so `tests.html` can drive it.

### Render architecture

Hash router: `window.addEventListener('hashchange', render)`; `render()` reads `location.hash` (default `#leaderboard`), calls one `renderX(mainEl, state)` function per screen, and re-applies the active-tab class. State mutations always go through `update(fn)` which mutates, saves, and re-renders. No virtual DOM; full-screen innerHTML rebuild per render is acceptable at this data size (6 clubs).

### Screen stubs in this phase

All five A5 screens exist as routes from Phase 1; Leaderboard shows a token-styled placeholder card list ("scores coming in Phase 2" is NOT acceptable — Phase 1 renders real computed totals in a minimal unstyled-but-tokenized list so the scoring engine is visibly exercised); the other four screens render titled placeholders. Components used this phase: AppShell only (tokens `--color-primary` header, `--color-bg` body, `--font-size-xl` titles, `--space-4` screen padding, tab bar with `--color-primary` active / `--color-text-muted` inactive, `--font-size-xs` tab labels).

### tests.html harness

Fetches `index.html`, extracts the inline script via regex on the `// === CORE ===` … `// === UI ===` markers, `eval`s the core in an isolated function scope, asserts with a 20-line `assertEq(name, actual, expected)` helper rendering pass/fail rows into the page. No framework. Test cases enumerated in plan Task 1.3 are the required set.

### Excel RANK semantics (locked detail)

`rank = 1 + count(other totals strictly greater)`. Ties share rank; next rank skips (two clubs at rank 1 → next is rank 3).
