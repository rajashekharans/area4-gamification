# Requirements

Extracted from both locked source docs. Sources:
- SPEC: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/specs/2026-06-11-area4-gamification-design.md
- PLAN: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/plans/2026-06-11-area4-gamification-plan.md

No competing acceptance variants — the plan was derived from the spec and is consistent with it.

---

## REQ-app-shell
- source: SPEC (A4 AppShell, A5); PLAN (Task 1.1)
- description: App shell with sticky brand header ("i-Differentiate Area 4", "Area 4 · District 90" subtitle) and bottom tab bar with 5 hash-routed screens: `#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`. Single `render()` dispatcher keyed on `location.hash`, re-rendered on any state change.
- acceptance: Shell renders; tabs switch screens per route; all styling via tokens only.

## REQ-leaderboard
- source: SPEC (A5 screen 1, A4 ClubCard/ScoreBreakdown/CalloutChip); PLAN (Task 2.1)
- description: Home screen with ranked ClubCards: rank medal (gold/silver/bronze tokens for top 3), club name, final score, movement arrow + delta text vs last snapshot. Tap-to-expand ScoreBreakdown showing six category rows (DCP, Distinguished, Membership, Admin, Awards, Club Health). CalloutChips row above: Leading Club, Biggest Mover (largest positive scoreDelta; "—" when no snapshot; Happy Yellow chip), Area Total (sum of all totals).
- acceptance: Cards sorted by rank; movement arrows paired with text (never color-only); breakdown shows per-category points.

## REQ-snapshots
- source: SPEC (B2 snapshots, A5 screen 1, B5 data safety); PLAN (Task 2.2)
- description: "Save weekly snapshot" button → Sheet confirm with editable `YYYY-MM-DD` date (defaults today) and current totals → push `{date, scores}` onto `state.snapshots`, prune to max 60 (oldest pruned), save, Toast "Snapshot saved". Movement (scoreDelta/rankDelta per club) computed against the latest stored snapshot.
- acceptance: Snapshot then change data → correct scoreDelta/rankDelta; pruning at 60; movement is zero/null when no snapshot exists.

## REQ-tmi-data-screen
- source: SPEC (A5 screen 2); PLAN (Task 3.1)
- description: TMI Data screen: last-sync stamp, ClubPicker, per-club editable TMI fields — membership base + current (clamp 0–500), 10 DCP goal ToggleChips (G1–G10 with workbook short labels), distinguished status select (None/D/S/P), ToggleChips for dues Oct / dues Apr / officer list, NumberStepper 0–2 for COT rounds. All inputs persist on change.
- acceptance: Every field writes state + saveState() on change.

## REQ-tmi-csv-ingestion
- source: SPEC (B4 TMI boundary, Error handling); PLAN (Task 3.2)
- description: "Refresh from TMI" fetches `GET https://dashboards.toastmasters.org/<programYear>/export.aspx?type=CSV&report=clubperformance~90~~~<programYear>` client-side. CORS is expected to block this → on any failure, Toast + automatic reveal of FileDrop fallback with step-by-step instructions (never a dead end). `parseCsv` is RFC-4180-ish (quoted fields, embedded commas/quotes/newlines). `mapTmiCsv` matches clubs by club number first, normalized name second (lowercase, strip non-alphanumerics, strip trailing "toastmasters"/"club"); maps columns by fuzzy header match (TMI renames headers between program years); applies workbook DCP goal thresholds (G1: Level1s ≥ 4 … G10: dues+list on time); per-row try/catch, never throws. Results Sheet reports clubs updated, unmatched clubs, and unmapped headers before committing — never silently dropped. Sample CSV at `sample-data/tmi-club-performance-sample.csv` with all 6 clubs + 2 non-Area-4 decoys (quoted comma names).
- acceptance: Sample CSV maps all 6 clubs, decoys ignored; quoted-comma names parse; goal thresholds correct (Level1s=4→G1 met, 3→not); missing club number falls back to name match.

## REQ-manual-entry
- source: SPEC (A5 screen 3); PLAN (Task 3.3)
- description: Manual Entry screen with ClubPicker and two sections per club: Awards (NumberSteppers for Smedley, Talk Up, Beat the Clock, Triple Crowns, Area/Division/District contest wins) and Club Health (meetings held stepper, avg attendance % numeric 0–100, guests stepper, conversions stepper).
- acceptance: All values persist; attendance clamps 0–100.

## REQ-minutes-extractor
- source: SPEC (Decisions table, A5 screen 3); PLAN (Task 3.3)
- description: Paste-minutes quick-parse helper: textarea + "Extract" button running regexes — attendance `(\d{1,3})\s*%` or `(\d+)\s*(?:of|\/)\s*(\d+)\s*members` → percent; guests `(\d+)\s*guests?`; conversions `(\d+)\s*(?:guests?\s*)?(?:joined|converted|new member)`; meetings `(\d+)\s*meetings?`. Pre-fills the Club Health form for user review (does not auto-save); "nothing found" Toast when no pattern matches.
- acceptance: 4 positive regex cases (incl. "12 of 18 members attended, 3 guests, 1 guest joined") + 1 negative pass in tests.html.

## REQ-trends-chart
- source: SPEC (A5 screen 4, B4 Chart.js boundary); PLAN (Task 4.1)
- description: Trends screen: Chart.js line chart of snapshot totals per club (x = snapshot date, one dataset per club; fixed 6-color series led by `--color-primary` and `--color-accent` read via getComputedStyle). Feature-detect `window.Chart`; render the same data as an HTML table when absent. Snapshot history list below: date + per-club totals, delete button per row with Sheet confirm.
- acceptance: Chart renders from snapshots; offline → table fallback; snapshot delete works with confirm.

## REQ-settings-weights
- source: SPEC (A5 screen 5, B2 weights); PLAN (Task 4.2)
- description: Settings screen with SettingsList groups: all 21 scoring weights/caps editable (numeric, clamped 0–100 integers, grouped DCP/Membership/Admin/Awards/Health with workbook labels), club config (names + club numbers editable — incl. filling in Prospect Phoenix), program year select (2025-2026 … 2027-2028), Danger zone "Reset to seed data" with Sheet confirm.
- acceptance: Weight edits immediately affect scores; clamps enforced.

## REQ-export-import
- source: SPEC (B4 JSON export/import, Error handling, B5 data safety); PLAN (Task 4.2)
- description: Export = Blob download `idiff-area4-backup-YYYY-MM-DD.json` of full AppState. Import = FileDrop → validate (`version === 1`, `config.clubs` array present, weights object) → preview Sheet (club count, snapshot count, last sync) → replace state only on confirm. Invalid file → error Toast with explicit error list; current state untouched. Import never overwrites without preview confirm.
- acceptance: Import validator accepts exported state, rejects `{}`, rejects version 99.

## REQ-seed-data
- source: SPEC (Seed data section, B2); PLAN (Task 1.2)
- description: DEFAULT_STATE seeds 6 clubs (ids/numbers per DEC-club-roster) with membership base/current 18/18, 22/22, 15/15, 20/20, 14/14, 16/16 (2026-07-01 workbook baseline); all DCP goals, awards, health values 0; distinguished status blank; `snapshots: []`; 21 weights at workbook defaults; `version: 1`; `programYear: "2025-2026"`, district 90, area 4.
- acceptance: Parity test — seed state gives every club total 0 except membership ≥20 bonus: Quakers Hill (22) +5, Blacktown City (20) +5, others 0.

## REQ-scoring-engine
- source: SPEC (B2 scoring engine, Testing approach); PLAN (Task 1.3)
- description: Pure `computeScores(state)` and `movementVs(snapshot, scores)` per DEC-scoring-formulas, structured so they can be extracted for testing. Companion `tests.html` (not shipped/linked) loads index.html's pure functions and asserts workbook parity: full-house club case → total 176 (dcp 50, dist 25, membership 13, admin 25, awards 33, health 30); boundaries (attendance 75→5, 74→3, 50→3, 49→0; members 20→bonus, 19→none; 12 guests→capped 10; 7 meetings→capped 5); negative growth (−3 → −6); Excel RANK tie semantics.
- acceptance: All tests.html assertions green.

## REQ-readme
- source: SPEC (B3 folder structure); PLAN (Task 4.3)
- description: README.md covering what the app is, weekly workflow (refresh TMI → update minutes data → save snapshot → share), GitHub Pages hosting, backup/restore, editing weights, club number config.
- acceptance: README present and covers the weekly ritual end-to-end.
