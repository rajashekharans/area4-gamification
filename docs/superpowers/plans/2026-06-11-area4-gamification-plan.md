# i-Differentiate Area 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file HTML gamification leaderboard (`index.html`) replacing the Area 4 Excel tracker, with TMI CSV ingestion, manual entry, editable weights, snapshots, and trends.

**Architecture:** Everything lives in `index.html`: a CSS block built on the design-system tokens from `docs/superpowers/specs/2026-06-11-area4-gamification-design.md`, a pure-function core (state, scoring, CSV parsing) and a render layer (hash-routed screens, A4 Kit components). State persists to localStorage; Chart.js loads from CDN with table fallback. A companion `tests.html` (not shipped) asserts workbook parity.

**Tech Stack:** Vanilla ES2020 JS, CSS custom properties, Chart.js 4.x UMD (jsdelivr CDN), localStorage. No build step, no backend.

**Design references (required reading per task):** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` — tokens A1–A3, components A4, screens A5, data model B2, integrations B4, constraints B5.

---

## Phase 1 — Core: skeleton, state, scoring engine

### Task 1.1: index.html skeleton with design tokens

**Files:**
- Create: `index.html`

- [ ] Write the HTML5 skeleton: `<head>` with viewport meta (`width=device-width, initial-scale=1`), title "i-Differentiate Area 4", `<style>` block declaring ALL A1 color tokens, A2 typography tokens, A3 spacing/radius tokens as `:root` custom properties exactly as named in the spec (`--color-primary`, `--color-accent`, `--color-gray`, `--color-yellow`, `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-success`, `--color-error`, `--color-gold`, `--color-silver`, `--color-bronze`; `--font-family`, `--font-size-xs/sm/base/lg/xl/2xl`; `--space-1..6`, `--radius-sm/md/lg`). Body uses `var(--font-family)`, `var(--color-bg)`, `var(--color-text)`.
- [ ] Add `<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>` and an inline `<script>` block with `"use strict";` IIFE.
- [ ] Add AppShell markup: `<header>` (brand bar, app title, "Area 4 · District 90" subtitle), `<main id="screen">`, `<nav>` bottom tab bar with 5 buttons (Leaderboard, TMI, Manual, Trends, Settings) wired to `location.hash`. Style per tokens only — no raw hex/px values outside the `:root` block.
- [ ] Verify in browser: shell renders, tabs switch an empty `<main>` placeholder per route.
- [ ] Commit: `feat: app shell with design tokens and tab navigation`

### Task 1.2: State module — defaults, load/save, seed data

**Files:**
- Modify: `index.html` (core script section)

- [ ] Implement `DEFAULT_STATE` exactly per spec B2: 6 clubs with ids `marsden-park`, `quakers-hill`, `prospect-phoenix`, `blacktown-city`, `rooty-hill`, `holroyd`; club numbers `28679342`, `9448`, `null`, `3378`, `9627`, `7851`; membership base/current 18/18, 22/22, 15/15, 20/20, 14/14, 16/16; the 21 weight keys with workbook defaults (`dcpGoal:5, distD:10, distS:15, distP:25, memberGrowth:2, memberBonus20:5, duesOnTime:5, officerList:5, cotRound:5, d90Award:5, tripleCrown:5, contestArea:3, contestDivision:5, contestDistrict:10, attendance75:5, attendance50:3, perGuest:1, guestCap:10, perConversion:5, perMeeting:1, meetingCap:5`); zeroed tmi goals/awards/health; `snapshots: []`; `version: 1`.
- [ ] Implement `loadState()` (parse localStorage key `idiff-area4-v1`, deep-merge over defaults so future fields don't break old saves, fall back to defaults on parse error) and `saveState()` (try/catch with Toast warning on quota error).
- [ ] Commit: `feat: app state with workbook seed data and localStorage persistence`

### Task 1.3: Scoring engine (pure) + parity tests

**Files:**
- Modify: `index.html`
- Create: `tests.html`

- [ ] Implement `computeScores(state)` returning `{[clubId]: {breakdown: {dcp, dist, membership, admin, awards, health}, total, rank}}` using exactly the six formulas in spec B2, including Excel RANK tie semantics (tied totals share the higher rank; next rank skips).
- [ ] Implement `movementVs(snapshot, scores)` returning per-club `{scoreDelta, rankDelta}` (zero/null when no snapshot exists).
- [ ] Write `tests.html`: loads `index.html` source via fetch, extracts the core script, and runs assertions with a tiny inline `assertEq` helper. Required cases: (a) seed state → every club total 0 except membership bonus check: Quakers Hill 22 members → +5, Blacktown 20 → +5, others 0; (b) full-house club (10 goals, P, +4 growth to 24, all admin, 1 Smedley, 2 TC, 1 each contest level, 80% attendance, 12 guests, 2 conversions, 7 meetings) → dcp 50, dist 25, membership 8+5, admin 25, awards 5+10+3+5+10, health 5+10+10+5 — total 176; (c) boundaries: attendance 75→5, 74→3, 50→3, 49→0; current 20→bonus, 19→none; 12 guests→capped 10; 7 meetings→capped 5; (d) negative growth −3 → −6; (e) tie ranking: two clubs equal → same rank, next skips.
- [ ] Open `tests.html` in browser; all assertions pass (green list, zero failures).
- [ ] Commit: `feat: scoring engine with workbook-parity tests`

## Phase 2 — Leaderboard, snapshots, movement

### Task 2.1: Leaderboard screen

**Files:**
- Modify: `index.html`

- [ ] Implement ClubCard component (A4 Kit): rank medal (gold/silver/bronze tokens for top 3, neutral elsewhere), club name (`--font-size-lg`, weight 600), final score (`--font-size-2xl`, `--color-primary`), movement arrow + delta text (`--color-success` up / `--color-error` down / muted dash for none — always with text, never color-only).
- [ ] Tap-to-expand ScoreBreakdown: six labeled rows (DCP, Distinguished, Membership, Admin, Awards, Club Health) with per-category points; uses `--space-3` row padding and `--font-size-sm`.
- [ ] CalloutChips row above cards: Leading Club, Biggest Mover (largest positive scoreDelta; "—" when no snapshot), Area Total (sum of all totals). Biggest Mover chip uses `--color-yellow` background with `--color-text`.
- [ ] Render cards sorted by rank; re-render on any state change via a single `render()` dispatcher keyed on `location.hash`.
- [ ] Commit: `feat: leaderboard with club cards, breakdowns, callouts`

### Task 2.2: Snapshot system

**Files:**
- Modify: `index.html`

- [ ] "Save weekly snapshot" button on Leaderboard → Sheet confirm showing date (today, editable `YYYY-MM-DD` input) and current totals → push `{date, scores}` onto `state.snapshots`, prune to 60, save, Toast "Snapshot saved".
- [ ] Movement arrows and Biggest Mover now computed against `snapshots[snapshots.length-1]` taken **before** the new save (i.e., movement always compares live scores vs latest stored snapshot).
- [ ] Add parity tests to `tests.html`: snapshot then change data → correct scoreDelta/rankDelta; snapshot pruning at 60.
- [ ] Commit: `feat: weekly snapshots with rank movement`

## Phase 3 — Data ingestion: TMI + manual entry

### Task 3.1: TMI data screen (manual TMI fields)

**Files:**
- Modify: `index.html`

- [ ] TMI screen: last-sync stamp, ClubPicker, per-club form: membership base + current (numeric, clamp 0–500), 10 DCP goal ToggleChips labeled G1–G10 with the workbook's short labels, distinguished status select (None/D/S/P), ToggleChips for dues Oct / dues Apr / officer list, NumberStepper 0–2 for COT rounds. All inputs write state + `saveState()` on change.
- [ ] Commit: `feat: TMI data entry screen`

### Task 3.2: TMI CSV fetch + upload fallback

**Files:**
- Modify: `index.html`
- Create: `sample-data/tmi-club-performance-sample.csv`

- [ ] Create the sample CSV mirroring the real District 90 Club Performance export headers: `District,Division,Area,Club Number,Club Name,Club Status,Mem. Base,Active Members,Goals Met,Level 1s,Level 2s,Add. Level 2s,Level 3s,Level 4s, Level 5s, or DTM award,Add. Level 4s, Level 5s, or DTM award,New Members,Add. New Members,Off. Trained Round 1,Off. Trained Round 2,Mem. dues on time Oct,Mem. dues on time Apr,Off. List On Time,Club Distinguished Status` with rows for all 6 clubs plus 2 non-Area-4 decoys (quoted club names containing commas to exercise the parser).
- [ ] Implement `parseCsv(text)` (RFC-4180-ish: quoted fields, embedded commas/quotes/newlines) and `mapTmiCsv(rows, state)`: match clubs by club number first then normalized name (`lowercase, strip non-alphanumerics, strip trailing "toastmasters"/"club"`); map columns by fuzzy header match (case/punctuation-insensitive `includes` patterns, e.g. `mem` + `base` → base, `active` → current, `level 1` → G1...); DCP goal thresholds per workbook goal definitions (G1: Level1s ≥ 4; G2: Level2s ≥ 2; G3: Add.Level2s ≥ 2; G4: Level3s ≥ 2; G5: L4/L5/DTM ≥ 1; G6: Add. ≥ 1; G7: New ≥ 4; G8: Add.New ≥ 4; G9: both COT rounds ≥ 4 trained; G10: dues+list on time); distinguished status letter from status column (`P|S|D` prefix match). Returns `{updated: [...], unmatchedClubs: [...], unmappedHeaders: [...]}` — never throws on a bad row.
- [ ] "Refresh from TMI" button: `fetch` the B4 URL (programYear interpolated); on success pipe through `mapTmiCsv`; on any failure (CORS expected) Toast + reveal FileDrop with step-by-step instructions. FileDrop accepts `.csv` via input or drag, runs same mapper, then shows results Sheet (clubs updated, unmatched, unmapped headers) before committing to state.
- [ ] Add tests: sample CSV maps all 6 clubs, decoys ignored, quoted-comma names parse, goal thresholds (e.g. Level1s=4→G1 met, 3→not), missing club number falls back to name match.
- [ ] Commit: `feat: TMI CSV ingestion with CORS fallback upload`

### Task 3.3: Manual entry screen (Awards + Club Health + minutes helper)

**Files:**
- Modify: `index.html`

- [ ] Manual screen: ClubPicker; Awards section (NumberSteppers: Smedley, Talk Up, Beat the Clock, Triple Crowns, Area/Division/District wins); Club Health section (meetings held stepper, avg attendance % numeric 0–100, guests stepper, conversions stepper).
- [ ] Paste-minutes helper: textarea + "Extract" button running regexes over pasted text: attendance `(\d{1,3})\s*%` or `(\d+)\s*(?:of|\/)\s*(\d+)\s*members` → percent; guests `(\d+)\s*guests?`; conversions `(\d+)\s*(?:guests?\s*)?(?:joined|converted|new member)`; meetings `(\d+)\s*meetings?`. Pre-fills the Club Health form (user reviews before it saves); shows "nothing found" Toast when no pattern matches.
- [ ] Add tests for the extractor regexes (4 positive cases incl. "12 of 18 members attended, 3 guests, 1 guest joined", 1 negative).
- [ ] Commit: `feat: manual entry for awards and club health with minutes extractor`

## Phase 4 — Trends, settings, backup, polish

### Task 4.1: Trends screen

**Files:**
- Modify: `index.html`

- [ ] Line chart of snapshot totals per club (x = snapshot date, one dataset per club; colors derived from a fixed 6-color series led by `--color-primary` and `--color-accent` read via `getComputedStyle`). Feature-detect `window.Chart`; when absent render the same data as an HTML table.
- [ ] Snapshot history list below chart: date + per-club totals, swipe-free delete button per row (Sheet confirm).
- [ ] Commit: `feat: trends chart with snapshot history`

### Task 4.2: Settings screen + export/import

**Files:**
- Modify: `index.html`

- [ ] SettingsList groups: Scoring weights (all 21 keys, numeric inputs clamped 0–100, grouped DCP/Membership/Admin/Awards/Health with workbook labels), Clubs (name + club number editable), Program year select (e.g. 2025-2026 … 2027-2028), Danger zone (Reset to seed data with Sheet confirm).
- [ ] Export JSON: Blob download `idiff-area4-backup-YYYY-MM-DD.json` of full state. Import JSON: FileDrop → validate (`version === 1`, has `config.clubs` array, weights object) → preview Sheet (club count, snapshot count, last sync) → replace state on confirm; invalid file → error Toast, state untouched.
- [ ] Add tests: import validator accepts exported state, rejects `{}`, rejects version 99.
- [ ] Commit: `feat: settings, weight editor, JSON export/import`

### Task 4.3: Polish + README

**Files:**
- Modify: `index.html`
- Create: `README.md`

- [ ] Mobile pass at 360px: no horizontal scroll on any screen, touch targets ≥44px, breakdown accordion animates ≤200ms, WhatsApp in-app browser quirk check (no `100vh` traps — use `min-height: 100dvh` with fallback).
- [ ] README: what it is, weekly workflow (refresh TMI → update minutes data → save snapshot → share), hosting on GitHub Pages, backup/restore, editing weights, club number config.
- [ ] Run full `tests.html` suite; all green.
- [ ] Commit: `docs: README and mobile polish`

---

## Self-review notes

- Spec coverage: A5 screens 1–5 → Tasks 2.1/2.2, 3.1/3.2, 3.3, 4.1, 4.2; B4 integrations all covered (TMI 3.2, CDN 4.1, localStorage 1.2, export/import 4.2); error handling section → 1.2 (quota), 3.2 (fetch/parse), 4.2 (import).
- Naming consistency: `computeScores`, `movementVs`, `parseCsv`, `mapTmiCsv`, `loadState`, `saveState` used consistently across tasks.
- Token discipline: every UI task names its tokens; no raw style values appear in task descriptions.
