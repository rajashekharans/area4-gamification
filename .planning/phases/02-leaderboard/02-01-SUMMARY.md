---
phase: 02-leaderboard
plan: 01
subsystem: ui
tags: [vanilla-js, css-tokens, leaderboard, snapshots, bottom-sheet, accessibility]

# Dependency graph
requires:
  - phase: 01-core
    provides: window.A4 (DEFAULT_STATE, loadState, saveState, computeScores, movementVs, toast, update), CORE/UI region markers, render() dispatcher, esc(), tests.html CASES harness (32 green)
provides:
  - CORE pure helpers saveSnapshot(state, date) and areaTotals(scores), both on window.A4
  - Full leaderboard screen — ClubCard with medal badges + movement lines, ScoreBreakdown accordion, CalloutChips (Leading Club / Biggest Mover / Area Total)
  - Generic Sheet component openSheet({title, bodyHtml, confirmLabel, onConfirm}) + scrim CSS (A4 Kit) for reuse in phases 3-4
  - Save weekly snapshot flow with local-date default, YYYY-MM-DD validation, prune-to-60, same-date replace
  - tests.html extended to 41 assertions (areaTotals, saveSnapshot purity/replace/prune, movement-vs-saved-snapshot parity)
affects: [03-data-entry, 04-trends-settings, trends, snapshots, sheet]

# Tech tracking
tech-stack:
  added: []
  patterns: [generic openSheet bottom-sheet modal (onConfirm returning false keeps sheet open), UI-local expandedClubId accordion state surviving re-render, medal styling only when the whole tie group fits inside top-3, local-time YYYY-MM-DD construction (no toISOString)]

key-files:
  created: []
  modified: [index.html, tests.html]

key-decisions:
  - "Medal styling rule: a (possibly tied) rank group gets gold/silver/bronze only when every club at-or-above that rank fits within the top three positions — reconciles plan text (ranks 1/2/3 medalled) with the verification expectation that the seed four-way rank-3 tie renders neutral badges"
  - "openSheet onConfirm contract: returning false keeps the sheet open (used for date validation, T-02-01); any other return closes it — generic enough for phases 3-4 (CSV report, import preview)"
  - "Added two structural helper tokens to :root (--border-thin: 1px, --duration-fast: 200ms) so component CSS stays raw-value-free per the :root-only rule"

patterns-established:
  - "Sheet (A4 Kit): openSheet({title, bodyHtml, confirmLabel, onConfirm}) appended to body with .sheet-scrim; scrim tap and Cancel dismiss without state writes"
  - "Accordion: expandedClubId is UI-local (never persisted); taps toggle .expanded/aria-expanded directly so the max-height transition animates, while re-renders rebuild from the variable"
  - "Movement display: arrow always paired with signed text; rankDelta === null means no snapshot (— no snapshot yet), scoreDelta 0 with snapshot means — no change"

requirements-completed: [REQ-leaderboard, REQ-snapshots]

# Metrics
duration: 5min
completed: 2026-06-11
---

# Phase 2 Plan 01: Leaderboard, snapshots, movement Summary

**Ranked leaderboard with medal ClubCards, tap-to-expand six-category breakdowns, callout chips, and a pure saveSnapshot weekly-ritual flow (same-date replace, prune-to-60) behind a reusable bottom Sheet**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-11T00:10:37Z
- **Completed:** 2026-06-11T00:15:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced the Phase 1 placeholder leaderboard with the full home screen: six cards sorted by Excel-rank, gold/silver/bronze badges and left borders for the top-3, whole-card `role="button"` tap targets with Enter/Space keyboard support
- Movement lines always pair arrows with signed deltas (never color-only): `▲ +N since last snapshot` / `▼ −N` / `— no change` / `— no snapshot yet`; rank chips on the badge corner only when rankDelta is nonzero
- CalloutChips row: Leading Club (first by club order on rank ties), Biggest Mover (em dash without a snapshot or positive delta), Area Total via new CORE `areaTotals`
- New CORE pure helper `saveSnapshot(state, date)` — returns a new array, replaces same-date entries, prunes to 60 oldest-first — exported on `window.A4` with `areaTotals`
- Generic Sheet component (`openSheet`) + scrim CSS built for reuse by phases 3-4; snapshot confirm validates a complete YYYY-MM-DD (invalid → error Toast, sheet stays open, no state write)
- tests.html grew from 32 to 41 assertions, all green headlessly and in-browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Leaderboard screen — ClubCard, ScoreBreakdown, CalloutChips** - `62c3947` (feat: leaderboard with club cards, breakdowns, callouts)
2. **Task 2: Snapshot system — saveSnapshot, Sheet confirm, movement parity tests** - `5bf5ab8` (feat: weekly snapshots with rank movement)

## Files Created/Modified
- `index.html` - :root helper tokens (`--border-thin`, `--duration-fast`); chips/ClubCard/breakdown/button/Sheet CSS; CORE `areaTotals` + `saveSnapshot`; UI `openSheet`, `localToday`, `openSnapshotSheet`, full `renderLeaderboard`
- `tests.html` - 9 new assertions: areaTotals seed (10) and full-house (181); saveSnapshot append, stored-scores parity, purity, ordered append, same-date replace, prune-to-60; movement vs saved snapshot (+50 / +2 / −1)

## Decisions Made
- Medal styling limited to tie groups that fit entirely within the top three positions (seed state's four-way rank-3 tie renders neutral badges per the plan's verification section, while a no-tie board still medals ranks 1/2/3)
- `openSheet` onConfirm returning `false` keeps the sheet open — the generic validation hook phases 3-4 can reuse
- Two structural helper tokens added inside `:root` (`--border-thin: 1px`, `--duration-fast: 200ms`) to keep every component declaration `var(--token)`-only

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded a CSS comment that tripped the token-discipline check**
- **Found during:** Task 1 (verification)
- **Issue:** A comment reading "touch target >= 44px" matched the plan's raw-px grep (`[0-9]+px` outside `:root`), failing verification step 4
- **Fix:** Reworded the comment to name the spacing tokens instead of the pixel value
- **Files modified:** index.html
- **Verification:** `! sed '/:root {/,/^}/d' index.html | grep -qE '#[0-9A-Fa-f]{6}\b|[0-9]+px'` exits 0
- **Committed in:** 62c3947 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Cosmetic comment fix to satisfy the plan's own verification grep. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sheet component (`openSheet`) and `.btn-primary`/`.btn-secondary` styles ready for Phase 3 (CSV column report, FormRow screens) and Phase 4 (import preview)
- `state.snapshots` now populated by the UI; Phase 4 Trends can chart directly from it; snapshot history delete will reuse the same array shape
- Movement/ranking display fully wired — Phase 3 data entry will light it up via the existing `A4.update` path with no leaderboard changes needed

## Known Stubs
None — TMI / Manual / Trends / Settings screens remain the Phase 1 placeholder stubs by design (explicitly out of scope until phases 3-4); the leaderboard screen itself has no stubbed data paths.

## Self-Check: PASSED

- index.html, tests.html, 02-01-SUMMARY.md exist on disk
- Commits 62c3947 and 5bf5ab8 present in git log
- Headless suite: 41 passed, 0 failed

---
*Phase: 02-leaderboard*
*Completed: 2026-06-11*
