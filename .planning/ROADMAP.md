# Roadmap: i-Differentiate Area 4

## Overview

Build a single-file HTML leaderboard app for Toastmasters Area 4 in four dependency-ordered phases, mirroring the locked implementation plan (`docs/superpowers/plans/2026-06-11-area4-gamification-plan.md`): first the invisible core (shell, persisted state, workbook-parity scoring engine), then the leaderboard with snapshots and movement, then the two data-ingestion paths (TMI CSV + manual minutes entry), and finally trends, settings, backup, and mobile polish. Each phase ends with something verifiable in a browser at 360px, and the whole journey terminates at the Area Director's weekly ritual working end-to-end on a phone with Excel-exact scores.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g. 2.1): Urgent insertions (marked with INSERTED)

- [x] Phase 1: Core: skeleton, state, scoring engine — App shell + tokens, persisted seed state, workbook-parity scoring with tests.html green
- [ ] Phase 2: Leaderboard, snapshots, movement — Ranked club cards with breakdowns/callouts, manual weekly snapshots, movement deltas
- [ ] Phase 3: Data ingestion: TMI + manual entry — TMI fields screen, CSV fetch/upload with fuzzy mapping, awards/health entry + minutes extractor
- [ ] Phase 4: Trends, settings, backup, polish — Trends chart with fallback, weight/club settings, export/import, mobile polish + README

## Phase Details

### Phase 1: Core: skeleton, state, scoring engine
**Goal**: The app's invisible foundation works: a token-styled shell that routes between five screens, state that survives reloads, and a scoring engine that matches the Excel workbook exactly
**Depends on**: Nothing (first phase)
**Requirements**: REQ-app-shell, REQ-seed-data, REQ-scoring-engine
**Success Criteria** (what must be TRUE):
  1. Opening `index.html` in a browser (including from `file://`) shows the branded sticky header and 5-tab bottom bar, and tapping tabs switches hash-routed screens (`#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`)
  2. Edits to state survive a page reload (localStorage key `idiff-area4-v1`); with storage cleared, the app boots to seed data showing all six Area 4 clubs
  3. Seed-state parity holds: every club totals 0 except the ≥20-member bonus — Quakers Hill +5 and Blacktown City +5
  4. All `tests.html` assertions pass: full-house club totals 176 with correct six-category breakdown, attendance/guest/meeting boundary and cap cases, negative growth, and Excel RANK tie semantics
  5. Source review finds no raw hex/px values outside the `:root` token block
**Plans**: TBD
**UI hint**: yes
*Plan-doc reference: PLAN Phase 1 (Tasks 1.1 skeleton+tokens, 1.2 state+seed+localStorage, 1.3 scoring engine+parity tests)*

### Phase 2: Leaderboard, snapshots, movement
**Goal**: Members see a ranked, explainable leaderboard, and the Area Director can save a weekly snapshot that drives movement arrows
**Depends on**: Phase 1
**Requirements**: REQ-leaderboard, REQ-snapshots
**Success Criteria** (what must be TRUE):
  1. The home screen lists all six clubs sorted by rank with gold/silver/bronze medals for the top 3, each card showing club name, total score, and movement arrow paired with delta text (never color-only)
  2. Tapping a club card expands a breakdown showing points for all six categories (DCP, Distinguished, Membership, Admin, Awards, Club Health)
  3. Callout chips show Leading Club, Biggest Mover (displays "—" when no snapshot exists), and Area Total
  4. Pressing "Save weekly snapshot" opens a confirm Sheet with an editable date defaulting to today; after saving and then changing club data, every club shows the correct scoreDelta and rankDelta versus that snapshot
  5. Snapshots prune to 60 entries (oldest removed), and movement is zero/null before any snapshot exists
**Plans**: TBD
**UI hint**: yes
*Plan-doc reference: PLAN Phase 2 (Tasks 2.1 leaderboard screen, 2.2 snapshot system + movement)*

### Phase 3: Data ingestion: TMI + manual entry
**Goal**: The Area Director can get all weekly data into the app on a phone — TMI dashboard data via CSV (fetch or upload) and minutes data via structured forms with a paste-parse shortcut
**Depends on**: Phase 2
**Requirements**: REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor
**Success Criteria** (what must be TRUE):
  1. On the TMI Data screen, every per-club field (membership base/current clamped 0–500, 10 DCP goal toggles, distinguished status, dues Oct/Apr, officer list, COT rounds 0–2) persists immediately on change and survives reload
  2. "Refresh from TMI" attempts the dashboards CSV fetch; on failure (CORS expected) the user sees a Toast and an automatically revealed FileDrop with step-by-step instructions — never a dead end
  3. Uploading the sample CSV updates all six clubs (including Prospect Phoenix via name fallback), ignores the two decoy clubs, parses quoted-comma names, applies workbook DCP goal thresholds, and shows a results Sheet (updated / unmatched / unmapped headers) before committing
  4. On the Manual Entry screen, all awards and club-health values persist per club, with attendance clamped to 0–100
  5. Pasting minutes text (e.g. "12 of 18 members attended, 3 guests, 1 guest joined") and pressing Extract pre-fills the Club Health form for review without auto-saving; unparseable text produces a "nothing found" Toast; the 4 positive + 1 negative extractor cases pass in tests.html
**Plans**: TBD
**UI hint**: yes
*Plan-doc reference: PLAN Phase 3 (Tasks 3.1 TMI fields screen, 3.2 CSV fetch + upload fallback + sample CSV, 3.3 manual entry + minutes extractor)*

### Phase 4: Trends, settings, backup, polish
**Goal**: The full weekly ritual is shareable and durable: trends over time, tunable weights and club config, safe backup/restore, and a polished phone experience documented in the README
**Depends on**: Phase 3
**Requirements**: REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-readme
**Success Criteria** (what must be TRUE):
  1. The Trends screen renders a Chart.js line of snapshot totals per club; with the CDN unreachable the same data appears as an HTML table, and the rest of the app keeps working
  2. The snapshot history list shows date + per-club totals with per-row delete behind a Sheet confirm
  3. In Settings, editing any of the 21 weights/caps (clamped 0–100 integers) immediately changes leaderboard scores; club names/numbers (including filling in Prospect Phoenix) and program year are editable; "Reset to seed data" requires a Sheet confirm
  4. Export downloads `idiff-area4-backup-YYYY-MM-DD.json`; importing it back shows a preview Sheet and restores state only on confirm; importing `{}` or version 99 shows explicit errors and leaves current state untouched
  5. At 360px width there is no horizontal scroll on any screen, touch targets are ≥44px, `index.html` is ≤150KB excluding Chart.js, and README.md documents the weekly ritual end-to-end (refresh TMI → minutes data → snapshot → share)
**Plans**: TBD
**UI hint**: yes
*Plan-doc reference: PLAN Phase 4 (Tasks 4.1 trends + history, 4.2 settings + export/import, 4.3 mobile polish + README)*

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core: skeleton, state, scoring engine | 0/TBD | Not started | - |
| 2. Leaderboard, snapshots, movement | 0/TBD | Not started | - |
| 3. Data ingestion: TMI + manual entry | 0/TBD | Not started | - |
| 4. Trends, settings, backup, polish | 0/TBD | Not started | - |

## Coverage

All 13 v1 requirements map to exactly one phase (see REQUIREMENTS.md Traceability). No orphans, no duplicates.

---
*Roadmap created: 2026-06-11 from locked plan `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` (phase structure locked by DEC-build-order)*
