---
phase: 03-ingestion
plan: 01
subsystem: ui
tags: [vanilla-js, csv, rfc-4180, fetch, filedrop, form-kit, regex-extractor, css-tokens]

# Dependency graph
requires:
  - phase: 01-core
    provides: window.A4 (DEFAULT_STATE, loadState, saveState, computeScores, update), CORE/UI region markers, render() dispatcher, esc(), tests.html CASES harness
  - phase: 02-leaderboard
    provides: openSheet({title, bodyHtml, confirmLabel, onConfirm}) generic bottom Sheet, showToast, btn-primary/btn-secondary styles, 41-assertion baseline
provides:
  - CORE pure functions on window.A4 — parseCsv (RFC-4180-ish), mapTmiCsv (number-first/name-fallback club matching, workbook G1-G10 thresholds, never throws), applyTmiUpdates (new tmi slice + ISO stamp), extractMinutes (minutes-text regexes)
  - A4 Kit form components — ClubPicker, FormRow, NumberStepper, ToggleChip (accent variant), FileDrop — shared by TMI and Manual screens
  - Full TMI Data screen — sync panel (Refresh from TMI + collapsed FileDrop + last-sync stamp), per-club membership/goals/distinguished/dues/COT form, results Sheet gating every CSV apply
  - Full Manual Entry screen — 7 award steppers, Club Health card (attendance clamped 0-100), paste-minutes helper with Sheet preview + DOM-only prefill flash
  - sample-data/tmi-club-performance-sample.csv — 6 Area 4 clubs (Prospect Phoenix number 0) + 2 decoys incl. quoted-comma name
affects: [04-trends-settings, settings, import-export, filedrop]

# Tech tracking
tech-stack:
  added: []
  patterns: [single shared ingest pipeline (parseCsv -> mapTmiCsv -> results Sheet) for fetch and upload, ordered first-match-wins header pattern table over normalized headers, UI-local selectedClubId shared across entry screens, DOM-only prefill (no state write) with one-shot CSS animation flash, error Toast variant via second showToast argument]

key-files:
  created: [sample-data/tmi-club-performance-sample.csv]
  modified: [index.html, tests.html]

key-decisions:
  - "Club matching: number first (string compare after stripping leading zeros; skipped when state number is null or CSV cell normalizes empty/0), then normalized name (lowercase, alphanumerics only, trailing toastmasters/club words stripped) — Prospect Phoenix (clubNumber null) matches by name"
  - "DCP goals always derived from G1-G10 thresholds, never read from the export's Goals Met column (reported as an unmapped header instead)"
  - "Dues/officer-list flags parse truthy/positive: numeric > 0, or text matching ^(y|on|true|met) — covers 1/0, Yes, and On Time cell styles"
  - "Added --duration-flash: 1500ms token to :root for the extract-prefill yellow fade (--duration-fast 200ms too quick to perceive)"
  - "Added an explicit Upload CSV… toggle next to Refresh from TMI so the FileDrop is reachable without first failing a fetch (plan only required auto-expand on failure)"

patterns-established:
  - "Ingest pipeline: runIngestPipeline(text) = mapTmiCsv(parseCsv(text), state) -> openTmiResultsSheet; both the fetch .then and the FileDrop handlers call it — one code path to test"
  - "mapTmiCsv error contract: per-row try/catch; problems collect into skippedRows / unmatchedClubs / unmappedFields, never thrown, all surfaced in the results Sheet"
  - "Form kit binding: stepper buttons and chips commit on click; free-text numeric inputs commit on change (not input) so full re-renders never fight the phone keyboard"
  - "Prefill-for-review: Sheet confirm writes input.value in the DOM only and flashes .flash; values persist solely via the inputs' own change handlers"

requirements-completed: [REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor]

# Metrics
duration: 13min
completed: 2026-06-11
---

# Phase 3 Plan 01: Data ingestion — TMI + manual entry Summary

**Both weekly data paths land: TMI CSV ingestion (fetch with CORS-fallback FileDrop, pure parseCsv/mapTmiCsv/applyTmiUpdates, results-Sheet-gated apply) plus full TMI and Manual entry forms on a reusable ClubPicker/FormRow/NumberStepper/ToggleChip kit with a paste-minutes extractMinutes helper**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-06-11T00:28:07Z
- **Completed:** 2026-06-11T00:41:13Z
- **Tasks:** 3
- **Files modified:** 3 (1 created)

## Accomplishments
- A4 Kit form components (ClubPicker, FormRow, NumberStepper, ToggleChip with accent variant, FileDrop) built once and reused verbatim by both entry screens; UI-local `selectedClubId` survives re-renders and is shared across TMI/Manual
- TMI Data screen: per-club membership (clamped 0-500 before write), 10 G1-G10 goal chips with workbook short labels, distinguished None/D/S/P accent radio chips, dues Oct/Apr + officer-list flags, COT stepper 0-2 — every control persists immediately through `A4.update`
- CORE `parseCsv`: quoted fields, embedded commas/newlines, escaped `""`, CRLF/LF, blank-line skip; CORE `mapTmiCsv`: header row found by scanning first 5 rows for "club name", ordered first-match-wins pattern table, number-first/name-fallback club matching, exact workbook thresholds (G1 L1s≥4 … G9 both COT rounds≥4, G10 dues AND list), P/S/D prefix distinguished mapping; never throws — skippedRows/unmatchedClubs/unmappedFields collected
- "Refresh from TMI" fetches the B4 dashboards URL built from `state.config`; ANY failure (CORS expected) shows an error Toast (new `--color-error` accent variant) and auto-expands the FileDrop with numbered step-by-step instructions — never a dead end; uploaded files run the exact same pipeline
- Results Sheet gates every apply: updated clubs with changed-field counts and names, unmatched decoys (quoted-comma name intact), unmapped headers, skipped-row reasons — Confirm applies `applyTmiUpdates` (new tmi slice + lastTmiSync), Cancel discards
- Manual Entry screen: 7 award steppers and Club Health card (meetings/guests/conversions steppers, attendance input clamped 0-100 with % suffix); paste-minutes textarea + accent-outline Extract button → CORE `extractMinutes` → Sheet preview → DOM-only prefill with yellow flash (no state write); nothing-found Toast on unparseable text
- tests.html grew from 41 to 70 assertions — parseCsv (3), mapTmiCsv fixture mapping/thresholds/fallback/malformed-tolerance (16), applyTmiUpdates purity (5), extractMinutes 4 positive + 1 negative — all green headlessly; the real sample CSV file was also piped through the extracted CORE as a smoke test (6 clubs mapped, 2 decoys unmatched, 0 skipped)

## Task Commits

Each task was committed atomically:

1. **Task 1: TMI Data screen — form kit + full per-club TMI form** - `6493340` (feat: TMI data entry screen)
2. **Task 2: TMI CSV ingestion — sample CSV, CORE pipeline, fetch + FileDrop, results Sheet, tests** - `03e316c` (feat: TMI CSV ingestion with CORS fallback upload)
3. **Task 3: Manual Entry screen — Awards/Club Health forms + extractMinutes flow + tests** - `f6a288d` (feat: manual entry for awards and club health with minutes extractor)

## Files Created/Modified
- `index.html` - :root `--duration-flash` token; ClubPicker/FormRow/NumberStepper/ToggleChip/FileDrop/sync-panel/minutes CSS; CORE `parseCsv`, `mapTmiCsv` (+ normalizeHeader/normalizeClubName/normalizeClubNumber + TMI_FIELD_PATTERNS), `applyTmiUpdates`, `extractMinutes`, all exported on `window.A4`; UI form kit helpers, full `renderTmi` + ingest wiring, full `renderManual` + extract flow; showToast error variant
- `tests.html` - 29 new assertions including the embedded TMI_CSV fixture kept in sync with the sample file
- `sample-data/tmi-club-performance-sample.csv` - exact plan-doc header set (quoted comma L4/L5/DTM headers), 6 Area 4 rows with deterministic test cells, 2 decoys (one quoted-comma name)

## Decisions Made
- Goals always derived from thresholds; the export's own "Goals Met" column is deliberately unmapped and reported as such
- Flag cells parse truthy/positive (`numeric > 0` or `^(y|on|true|met)` text) so 1/0, "Yes", and "On Time" exports all work
- `applyTmiUpdates` clones each club record and its goals array so the returned slice shares no mutable structure with the input state
- `--duration-flash: 1500ms` added to :root (new duration token, per the plan's explicit allowance) — 200ms is imperceptible for a review-prompt flash

## Deviations from Plan

### Auto-fixed / minor additions

**1. [Rule 2 - Missing critical functionality] "Upload CSV…" toggle in the sync panel**
- **Found during:** Task 2
- **Issue:** Plan only auto-expands the FileDrop on fetch failure; without a manual affordance the upload path is unreachable until a fetch fails (a soft dead end contradicting the never-a-dead-end requirement)
- **Fix:** Added a secondary "Upload CSV…" button that toggles the FileDrop open/closed; auto-expand on failure unchanged
- **Files modified:** index.html
- **Committed in:** 03e316c

**2. [Rule 3 - Blocking nuance] Extractor test (c) expected-object key order**
- **Found during:** Task 3
- **Issue:** `assertEq` compares `JSON.stringify` output, which is key-order-sensitive; `extractMinutes` inserts `guests` before `meetings`, so the plan's literal `{ meetings: 4, guests: 5 }` would fail despite identical data
- **Fix:** Expected literal written as `{ guests: 5, meetings: 4 }` (same data) with an explanatory comment
- **Files modified:** tests.html
- **Committed in:** f6a288d

**3. [Minor] Award/health steppers given a 999 upper clamp**
- **Found during:** Task 3
- **Issue:** Plan specifies only `min 0` for these steppers; an unbounded numeric input invites absurd persisted values (threat T-03-03 clamps-before-write)
- **Fix:** `clampNum(v, 0, 999)` sanity bound — no effect on any realistic value
- **Files modified:** index.html
- **Committed in:** f6a288d

---

**Total deviations:** 3 (1 usability-critical addition, 1 test-harness nuance, 1 defensive clamp)
**Impact on plan:** No scope creep; all CORE contracts, thresholds, and screen behaviors exactly as specified.

## Issues Encountered
None — all verification gates (headless suite, `node --check` of the extracted script, sample-CSV smoke test, token-discipline grep, scope guard) passed on first run after each task.

## User Setup Required
None. Browser checks remain for the orchestrator/user (CORS failure path, FileDrop drag-drop, 360px layout) — automated equivalents all pass.

## Next Phase Readiness
- FileDrop component + ingest-preview Sheet pattern ready for Phase 4 JSON import (same gate-with-Sheet contract)
- All scoring inputs (tmi/awards/health) now editable, so the leaderboard, movement, and Phase 4 Trends operate on real data via the existing `A4.update` path
- `state.lastTmiSync` now set by the apply flow; Settings (Phase 4) can edit `programYear`/`district`, which `tmiCsvUrl` already reads from state

## Known Stubs
None added this phase — Trends and Settings screens remain the Phase 1 placeholder stubs by design (Phase 4 scope). No empty-data wiring, placeholder text, or unwired components in the TMI/Manual screens.

## Threat Flags
None — all new surface (dashboards fetch, CSV file input, pasted minutes text, numeric form inputs) is covered by the plan's threat model; mitigations T-03-01..T-03-04 implemented (per-row try/catch, esc() on all CSV/paste-derived strings, clamps before writes, Sheet-gated apply).

## Self-Check: PASSED

- index.html, tests.html, sample-data/tmi-club-performance-sample.csv, 03-01-SUMMARY.md exist on disk
- Commits 6493340, 03e316c, f6a288d present in git log
- Headless suite: 70 passed, 0 failed; extracted script passes `node --check`; token grep clean; only external script is the Phase 1 Chart.js CDN tag

---
*Phase: 03-ingestion*
*Completed: 2026-06-11*
