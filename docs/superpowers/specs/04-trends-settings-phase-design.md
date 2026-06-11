# Phase 4 Design — Trends, settings, backup, polish

**Parent design system:** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED)
**Plan reference:** `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` Phase 4, Tasks 4.1–4.3

## Phase-specific decisions

### Trends screen

Chart card (`--color-surface`, `--radius-md`, `--space-4` padding): Chart.js line chart, one dataset per club, x = snapshot dates, y = totals. Series colors: fixed 6-entry palette read from tokens at render time via getComputedStyle — order: `--color-primary`, `--color-accent`, `--color-gold`, `--color-success`, `--color-silver`, `--color-bronze` (distinct, brand-led). Legend bottom, `--font-size-xs`. Chart instance destroyed and rebuilt on each render (avoids canvas leak on tab switches). Feature-detect `window.Chart`; absent → same data as a scrollable HTML table (dates × clubs), plus a muted note that the chart needs a network connection once.

Empty state (0 snapshots): friendly card "No snapshots yet — save one from the Leaderboard". 1 snapshot: chart still renders (points, no lines needed — Chart.js handles single-point datasets fine).

Snapshot history list below: each row date + Area total + delete button (`--color-error` text), delete confirms via existing Sheet.

### Settings screen

SettingsList groups in workbook order, each a surface card with `--font-size-sm` group caption:
1. **Scoring weights** — 5 sub-groups (DCP, Membership, Admin & Deadlines, Awards, Club Health) with the workbook's exact row labels; numeric inputs (inputmode numeric, clamp 0–100 integers) bound to the 21 weight keys via update().
2. **Clubs** — per club: name text input + club number input (digits, may be empty → stored null). Prospect Phoenix's missing number gets a hint chip.
3. **Program year** — select with options 2025-2026 / 2026-2027 / 2027-2028 (drives the TMI fetch URL).
4. **Backup** — Export JSON button (downloads `idiff-area4-backup-YYYY-MM-DD.json`), Import JSON FileDrop → CORE `validateImport(obj)` → preview Sheet (club count, snapshot count, lastTmiSync) → replace state + full re-render on confirm.
5. **Danger zone** — "Reset to seed data" (`--color-error` outline button), Sheet confirm, replaces state with DEFAULT_STATE deep copy.

### New CORE functions

`validateImport(obj)` → `{ok: true, summary: {...}} | {ok: false, errors: [...]}` — checks: object, `version === 1`, `config.clubs` array length ≥ 1 with id+name strings, `weights` object with all-numeric values, `snapshots` array (if present). On import, unknown keys are preserved; missing slices fall back to deep-merge over DEFAULT_STATE (same path as loadState).

### Polish checklist (Task 4.3)

- `min-height: 100dvh` shell with fallback for WhatsApp in-app browser; no fixed `100vh` traps.
- No horizontal scroll on any screen at 360px (audit each screen).
- All touch targets ≥ the spacing-token-defined minimum (audit steppers/chips/tabs).
- README.md: purpose, weekly ritual, GitHub Pages hosting steps, backup/restore, weights/club config, TMI CSV export instructions, tests.html note.
