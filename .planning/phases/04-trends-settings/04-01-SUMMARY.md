---
phase: 04-trends-settings
plan: 01
subsystem: ui
tags: [chart.js, vanilla-js, css-tokens, localstorage, json-import, blob-export, dvh]

# Dependency graph
requires:
  - phase: 01-core
    provides: CORE region (DEFAULT_STATE, loadState/saveState, computeScores, deepMerge/isPlainObject), token system, AppShell, hash router, Sheet/Toast
  - phase: 02-leaderboard
    provides: snapshots schema + saveSnapshot/areaTotals/movementVs, openSheet contract, localToday, touch-target calc convention
  - phase: 03-ingestion
    provides: FileDrop kit classes + input/dragover/drop wiring pattern, formRow/num-input kit, change-not-input commit convention, showToast error variant
provides:
  - CORE validateImport(obj) on window.A4 (schema gate for backup import; never throws)
  - Full Trends screen — token-palette Chart.js line, window.Chart feature-detect with HTML-table fallback, empty/single-snapshot states, snapshot history with Sheet-confirmed delete
  - Full Settings screen — 5 SettingsList groups (21 weights, clubs, program year, backup export/import, danger-zone reset)
  - dvh shell sizing via :root --shell-min-height token (vh fallback first)
  - README.md for the non-technical Area Director
affects: [project-complete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chart palette read at render time via getComputedStyle in fixed token order (primary, accent, gold, success, silver, bronze)"
    - "UI-local chart instance destroyed before every rebuild (canvas leak guard on hot update() path)"
    - "replaceState(next): full-state swap deletes/reassigns every top-level key on the EXISTING state object so closures stay valid"
    - "Viewport-unit tokens: vh fallback declared in :root, dvh re-declared inside @supports — raw values stay in :root declarations"

key-files:
  created: [README.md]
  modified: [index.html, tests.html]

key-decisions:
  - "validateImport returns early for non-plain-object input (one error) but accumulates all other check failures into errors[] — {} yields three explicit errors"
  - "Toast error text passed raw to showToast (renders via textContent, inherently inert); esc() reserved for innerHTML interpolation (Sheets, screens) per threat T-04-02"
  - "Club numbers stored as parseInt of stripped digits (leading zeros lost) — matches existing seed data; CORE normalizeClubNumber already compares with zeros stripped"
  - "shortClubName display helper (UI) strips trailing Toastmasters/Club for compact history rows and table/legend labels; CORE normalizeClubName untouched"

patterns-established:
  - "Sheet-gated destructive actions: snapshot delete, import overwrite, seed reset all confirm via openSheet before any state write"
  - "Full-state replacement flows: deepMerge(structuredClone(DEFAULT_STATE), imported) — the loadState path — so missing slices default and unknown keys persist"

requirements-completed: [REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-readme]

# Metrics
duration: 18min
completed: 2026-06-11
---

# Phase 4 Plan 1: Trends, Settings, Backup, Polish Summary

**Token-palette Chart.js trends with offline table fallback, a 5-group Settings screen (21 workbook weights, clubs, program year, validated JSON backup/restore, seed reset), dvh shell fix and an Area-Director README — project feature-complete at 75 green assertions and 81.8KB.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-11T00:53:18Z
- **Completed:** 2026-06-11T01:10:54Z
- **Tasks:** 3/3
- **Files modified:** 3 (index.html, tests.html, README.md created)

## Accomplishments

- **Trends screen:** Chart.js line of snapshot totals, one dataset per club, colors read at render time from the fixed 6-token palette (`--color-primary`, `--color-accent`, `--color-gold`, `--color-success`, `--color-silver`, `--color-bronze`); bottom legend sized from `--font-size-xs`; chart instance destroyed before every rebuild. `window.Chart` feature-detect renders the same snapshot data as a wrapper-scrolled HTML table plus a muted network note when the CDN is unreachable. Empty state card for 0 snapshots; single snapshot renders points. History list (newest first) shows date, per-club totals, Area total, and a Sheet-confirmed per-row Delete through the single `A4.update` mutation path.
- **CORE `validateImport`:** pure, DOM-free, on `window.A4` — plain-object / `version === 1` / clubs-array (string id+name, length ≥ 1) / all-finite-numeric weights / snapshots-array-when-present checks; human-readable error per failed check; never throws.
- **Settings screen:** five SettingsList groups — all 21 weights with the workbook's exact row labels under DCP / Membership / Admin & Deadlines / Awards / Club Health (clamp 0–100 ints, unparseable input reverts, leaderboard re-scores immediately); club names (empty reverts) and numbers (digits-only, empty → null, Prospect Phoenix hint chip); program year select (drives TMI URL); Export JSON Blob download `idiff-area4-backup-YYYY-MM-DD.json` + always-visible import FileDrop with preview Sheet (clubs/snapshots/last sync) and explicit-error rejection leaving state untouched; danger-zone reset to a `structuredClone(DEFAULT_STATE)` copy behind a Sheet confirm.
- **Polish + docs:** body min-height flows through `--shell-min-height` (`100vh` fallback, `100dvh` re-declared in `@supports` — raw values stay in `:root`); narrow-viewport guards (toast max-width/wrap, overflow-wrap on user-editable club names in cards and chips); README.md covering purpose, weekly ritual end-to-end, GitHub Pages steps, backup/restore, weights/club config, manual TMI CSV export, and the tests.html note.

## Task Commits

Each task was committed atomically:

1. **Task 1: Trends screen** — `99dd709` (feat: trends chart with snapshot history)
2. **Task 2: Settings + validateImport + tests** — `23537f4` (feat: settings, weight editor, JSON export/import)
3. **Task 3: Mobile polish + README** — `fb52438` (docs: README and mobile polish)

## Files Created/Modified

- `index.html` — CORE `validateImport` added (exported on `window.A4`); `renderTrends` and `renderSettings` stubs replaced with full screens; Trends/Settings CSS (all `var(--token)`); `--shell-min-height` token + `@supports` dvh re-declaration; dead `screenStub`/`.screen-note` removed. 81.8 KB (cap 150 KB excluding Chart.js); the Chart.js CDN `<script defer>` tag remains the only external reference.
- `tests.html` — 5 new `validateImport` CASES (accepts exported state shape; rejects `{}` with errors; rejects version 99; rejects string-typed weight; rejects non-array snapshots). Suite: **75 passed, 0 failed** (70 prior + 5 new) via the headless node runner.
- `README.md` — new; all seven phase-design content areas, written for a non-technical Area Director.

## Verification Results

- Headless suite (CORE extraction + CASES extraction): `75 passed, 0 failed`, exit 0 — run after every task.
- `node --check` on the full extracted inline script: clean.
- Token discipline: `sed '/:root {/,/^}/d' index.html | grep -E '#hex|px'` → no matches (one comment reworded to keep the guard clean).
- Size: 83,788 bytes (81.8 KB) ≤ 153,600.
- External refs: only `https://cdn.jsdelivr.net/npm/chart.js@4` (`<script defer>`, line 706). The TMI dashboards URL is a runtime fetch boundary (design B4), not a resource reference.
- Required greps: `new Chart(`, `window.Chart`, `getComputedStyle`, `No snapshots yet`, `function validateImport`, `A4.validateImport`, `idiff-area4-backup-`, `shell-min-height`, `dvh`, README GitHub Pages/backup/snapshot/tests.html — all present.
- **Manual browser checks outstanding** (cannot run headlessly): 360px no-horizontal-scroll walkthrough of all five screens, chart render + CDN-blocked fallback, tab-switch canvas destroy/rebuild, import/export round-trip, tests.html over http. CSS audit found no overflow vectors; guards added proactively (toast width, club-name wrap, table wrapper overflow).

## Decisions Made

- `validateImport` short-circuits only the non-plain-object case (subsequent property reads would throw on `null`); all other failed checks accumulate so the error Toast lists everything wrong at once.
- Toast error strings are passed raw — `showToast` renders via `textContent`, which is inherently inert; routing them through `esc()` would display double-escaped entities. `esc()` is applied at every innerHTML interpolation point (preview Sheet, history rows, fallback table, settings rows), satisfying threat T-04-02's intent.
- Club numbers commit as `parseInt` of the digit-stripped input (consistent with numeric seed data); CORE matching already normalizes leading zeros.
- Shared `replaceState(next)` helper backs both import-confirm and seed-reset: deletes then reassigns every top-level key on the existing state object inside one `update()` call, so all closures keep pointing at the same object.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Token-discipline guard tripped by a CSS comment**
- **Found during:** Task 1 verification
- **Issue:** A new comment containing "360px" matched the no-raw-px verification grep (which doesn't distinguish comments).
- **Fix:** Reworded the comment ("B5 narrow-viewport rule").
- **Files modified:** index.html
- **Verification:** Guard exits clean.
- **Committed in:** `99dd709`

**2. [Rule 2 - Polish/correctness] Narrow-viewport overflow guards not in plan text**
- **Found during:** Task 3 (360px audit step)
- **Issue:** Long import-error Toasts and user-editable unbroken club names could force horizontal scroll at 360px (no max-width/wrap rules existed).
- **Fix:** `.toast` max-width + `overflow-wrap: anywhere`; `overflow-wrap: anywhere` on `.club-name` and `.chip-value`; `.chip` max-width — all token/percent-based, no type shrinking.
- **Files modified:** index.html
- **Committed in:** `fb52438`

**3. [Rule 1 - Cleanup] Dead code removal**
- **Found during:** Task 2
- **Issue:** `screenStub()` and `.screen-note` became unreachable once both stubs were replaced.
- **Fix:** Removed both.
- **Committed in:** `23537f4`

---

**Total deviations:** 3 auto-fixed (2× Rule 1, 1× Rule 2)
**Impact on plan:** All cosmetic/correctness-level; no scope creep, no contract changes.

## Issues Encountered

None.

## Known Stubs

The Prospect Phoenix club number remains `null` by design (LOCKED design decision — number unknown as of 2026-06-11). The Settings hint chip ("Club number TBC — add it here") is the designed resolution path; not a code stub.

## User Setup Required

None — no external service configuration. Optional: host `index.html` on GitHub Pages per README.

## Next Phase Readiness

Final phase — project feature-complete. All four ROADMAP Phase 4 requirements implemented (REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-readme). Outstanding: human browser walkthrough of the five screens at 360px per the plan's manual verification list (orchestrator/user verification step).

## Self-Check: PASSED

- index.html, tests.html, README.md, 04-01-SUMMARY.md exist on disk
- Commits 99dd709, 23537f4, fb52438 present in git log
- Headless suite: 75 passed, 0 failed

---
*Phase: 04-trends-settings*
*Completed: 2026-06-11*
