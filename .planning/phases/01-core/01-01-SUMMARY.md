---
phase: 01-core
plan: 01
subsystem: ui
tags: [vanilla-js, css-custom-properties, localstorage, hash-routing, chartjs-cdn, single-file]

# Dependency graph
requires: []
provides:
  - "index.html app shell: :root design tokens (A1-A3), sticky header, 5-tab hash-routed bottom bar"
  - "AppState persisted to localStorage key idiff-area4-v1 with deep-merge load and quota-safe save"
  - "DEFAULT_STATE seed: 6 Area 4 clubs, 21 workbook weights, zeroed tmi/awards/health, empty snapshots"
  - "Pure scoring engine computeScores + movementVs with Excel RANK tie semantics, workbook-parity proven"
  - "window.A4 = { DEFAULT_STATE, loadState, saveState, computeScores, movementVs, update, toast }"
  - "tests.html parity harness: fetch + CORE-region extraction, 32 assertions, browser + headless node"
affects: [02-leaderboard, 03-ingestion, 04-trends-settings]

# Tech tracking
tech-stack:
  added: [Chart.js 4 UMD via jsdelivr CDN (defer, unused until Phase 4)]
  patterns:
    - "CORE/UI script regions with // === CORE === and // === UI === markers (CORE is DOM-free)"
    - "update(fn) single mutation path: mutate -> saveState -> render"
    - "Full-screen innerHTML rebuild per render, dispatcher keyed on location.hash"
    - "Token-only styling: raw values exist solely in the :root block"
    - "tests.html CASES region markers so node can run the identical assertion set headlessly"

key-files:
  created: [index.html, tests.html]
  modified: []

key-decisions:
  - "movementVs returns { scoreDelta: 0, rankDelta: null } per club when no snapshot exists (plan said 'zero/null'; chose 0 for score, null for rank since no previous rank is meaningful)"
  - "rankDelta = previous rank - current rank, so positive means the club moved up the board"
  - "tests.html cases wrapped in // === CASES === markers so the headless node runner and the browser harness share one assertion source"

patterns-established:
  - "CORE region evaluable with a stub window and no DOM (loadState/saveState localStorage access wrapped in try/catch)"
  - "saveState reaches the Toast only via guarded window.A4.toast reference"
  - "A4 Kit CSS classes appear in kit order: AppShell, ClubCard, Toast"

requirements-completed: [REQ-app-shell, REQ-seed-data, REQ-scoring-engine]

# Metrics
duration: 9min
completed: 2026-06-11
---

# Phase 1 Plan 01: Core skeleton, state, scoring engine Summary

**Single-file app shell with token-only styling and 5-route hash navigation, localStorage-persisted six-club seed state, and an Excel-workbook-parity scoring engine proven by a 32-assertion tests.html suite (all green headlessly via node)**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-10T23:48:10Z
- **Completed:** 2026-06-10T23:56:35Z
- **Tasks:** 3 (Task 3 executed TDD: RED then GREEN)
- **Files modified:** 2 (index.html created, tests.html created)

## Accomplishments
- index.html (451 lines): complete A1-A3 token set in `:root`, sticky branded header, fixed 5-tab bar, hash router defaulting to `#leaderboard`, Chart.js 4 CDN tag (defer), CORE/UI region markers
- DEFAULT_STATE matches design.md B2 + seed table exactly: 6 clubs (marsden-park 28679342 18/18, quakers-hill 9448 22/22, prospect-phoenix null 15/15, blacktown-city 3378 20/20, rooty-hill 9627 14/14, holroyd 7851 16/16) and all 21 weight defaults
- loadState deep-merges saved JSON over a fresh defaults clone (T-01-01 mitigation); saveState catches quota/private-mode failures and warns via guarded Toast reference (T-01-02 mitigation)
- computeScores implements the six B2 formulas with Excel RANK tie semantics; movementVs computes scoreDelta/rankDelta vs snapshots
- Leaderboard renders all six clubs with real computed totals sorted by rank (seed: Quakers Hill 5, Blacktown City 5 at shared rank 1; others 0 at rank 3)
- tests.html: 32 assertions covering seed parity, full-house 176 (50/25/13/25/33/30), attendance 75/74/50/49 boundaries, >=20 bonus boundary, guest cap 12->10, meeting cap 7->5, negative growth -3 -> -6, RANK ties, movementVs null + snapshot cases — **32 passed, 0 failed**

## Task Commits

Each task was committed atomically:

1. **Task 1: index.html skeleton with design tokens and routed app shell** - `1e1ca78` (feat)
2. **Task 2: State module — seed, loadState/saveState, persistence** - `a7aca83` (feat)
3. **Task 3: Scoring engine + parity suite (TDD)** - `33dd839` (test, RED) → `c3b2b13` (feat, GREEN)

## Files Created/Modified
- `index.html` - The entire app: tokens, AppShell, hash router, CORE state + scoring engine, UI renderers, window.A4 exposure
- `tests.html` - Workbook-parity harness: fetches index.html, extracts CORE region, runs 32 assertions, renders pass/fail rows + summary line

## Decisions Made
- movementVs no-snapshot shape locked as `{ scoreDelta: 0, rankDelta: null }`; rankDelta sign = previous − current (positive = moved up)
- Added `// === CASES ===` / `// === END CASES ===` markers inside tests.html so the identical assertion set runs headlessly in node (required since no browser CLI is available in this environment)
- Renderers receive `(mainEl, state)` per the phase design's dispatcher signature

## TDD Gate Compliance
RED gate: `33dd839` test commit (harness failed with "computeScores is not a function", 0 passed / 1 failed). GREEN gate: `c3b2b13` feat commit (32 passed / 0 failed). No refactor commit needed.

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
Intentional per plan/phase design ("the other four screens render titled placeholders"); each is resolved by a scheduled later phase:
- `index.html` renderTmi — titled placeholder, real TMI entry in Phase 3 (Task 3.1)
- `index.html` renderManual — titled placeholder, real entry forms in Phase 3 (Task 3.3)
- `index.html` renderTrends — titled placeholder, chart in Phase 4 (Task 4.1)
- `index.html` renderSettings — titled placeholder, weight editor in Phase 4 (Task 4.2)

Leaderboard is NOT a stub: it renders real computed totals from seed state.

## Issues Encountered
None. One cosmetic adjustment during Task 1: a CSS comment containing "44px" tripped the raw-pixel grep sweep; reworded so the token-discipline sweep stays clean.

## Verification Evidence
- Headless suite (node, CORE region extracted with the same regex tests.html uses): **32 passed, 0 failed**
- `node --check` on the extracted inline script: syntax OK
- Token sweep `grep -nE '#[0-9a-fA-F]{3,8}\b|[0-9]+px' index.html`: every hit inside the `:root` block (lines 13–47)
- Required markers/links: `hashchange` (1), `=== CORE ===` present, `cdn.jsdelivr.net/npm/chart.js@4` (1), `window.A4` (6), `idiff-area4-v1` (1)
- Both files serve over http (python3 -m http.server: 200/200); index.html has no fetch dependency so file:// works

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- State shape, scoring engine, and CORE/UI region layout locked — Phase 2 (leaderboard cards, snapshots, movement) can build directly on window.A4 and the established render dispatcher
- Outstanding (not a blocker): Prospect Phoenix club number remains null pending Area Director input (editable in Settings, Phase 4)
- Browser-based visual check (360px viewport, tab switching, persistence across reload) still recommended by the orchestrator's verifier; all automatable checks pass

## Self-Check: PASSED
All created files exist (index.html, tests.html, 01-01-SUMMARY.md); all task commits found (1e1ca78, a7aca83, 33dd839, c3b2b13).

---
*Phase: 01-core*
*Completed: 2026-06-11*
