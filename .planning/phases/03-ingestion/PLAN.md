---
phase: 03-ingestion
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [index.html, tests.html, sample-data/tmi-club-performance-sample.csv]
autonomous: true
requirements: [REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor]
must_haves:
  truths:
    - "On the TMI Data screen every per-club field (membership base/current clamped 0-500, 10 DCP goal toggles, distinguished status None/D/S/P, dues Oct/Apr, officer list, COT rounds 0-2) persists immediately on change and survives a page reload"
    - "Refresh from TMI attempts the dashboards CSV fetch; on failure (CORS expected) the user sees a Toast and an automatically revealed FileDrop with step-by-step instructions — never a dead end"
    - "Uploading the sample CSV updates all six clubs (Prospect Phoenix via name fallback), ignores the two decoy clubs, parses quoted-comma names, applies workbook DCP goal thresholds, and shows a results Sheet (updated / unmatched / unmapped headers) before committing"
    - "On the Manual Entry screen all seven awards counts and four club-health values persist per club, with attendance clamped 0-100"
    - "Pasting minutes text and pressing Extract shows a Sheet preview, then pre-fills the Club Health form for review without auto-saving; unparseable text produces a nothing-found Toast"
  artifacts:
    - path: "index.html"
      provides: "CORE pure functions parseCsv/mapTmiCsv/applyTmiUpdates/extractMinutes on window.A4; ClubPicker/FormRow/NumberStepper/ToggleChip/FileDrop kit; full renderTmi and renderManual screens"
      contains: "function mapTmiCsv"
    - path: "tests.html"
      provides: "CASES assertions for parseCsv, mapTmiCsv (6-club mapping, decoys, quoted commas, thresholds, name fallback, malformed-row tolerance), applyTmiUpdates, and the 4 positive + 1 negative extractMinutes cases"
      contains: "extractMinutes"
    - path: "sample-data/tmi-club-performance-sample.csv"
      provides: "Realistic D90 Club Performance export: header row per plan Task 3.2, all 6 Area 4 clubs (Prospect Phoenix club number 0), 2 non-Area-4 decoys incl. a quoted comma name"
      contains: "Club Distinguished Status"
  key_links:
    - from: "Refresh from TMI button / FileDrop"
      to: "CORE parseCsv -> mapTmiCsv"
      via: "single shared ingest pipeline for both fetch success and file upload"
      pattern: 'mapTmiCsv\('
    - from: "results Sheet confirm"
      to: "CORE applyTmiUpdates"
      via: "A4.update writes the returned tmi slice + lastTmiSync into state"
      pattern: 'applyTmiUpdates\('
    - from: "TMI / Manual form controls"
      to: "state.tmi / state.awards / state.health"
      via: "A4.update single mutation path (mutate -> saveState -> render)"
      pattern: 'A4\.update|update\(function'
    - from: "Extract from minutes button"
      to: "CORE extractMinutes"
      via: "Sheet preview of found values, then DOM-only prefill + flash (no state write)"
      pattern: 'extractMinutes\('
    - from: "tests.html CASES region"
      to: "window.A4.parseCsv / mapTmiCsv / applyTmiUpdates / extractMinutes"
      via: "headless extraction of the CORE region markers"
      pattern: 'A4\.mapTmiCsv'
---

<objective>
Phase 3 of i-Differentiate Area 4: both data-ingestion paths. The TMI Data screen gets the full per-club editable form (membership, 10 DCP goal chips, distinguished status, dues/officer-list/COT) built on a reusable form kit (ClubPicker, FormRow, NumberStepper, ToggleChip); the TMI CSV pipeline lands as pure CORE functions (`parseCsv`, `mapTmiCsv`, `applyTmiUpdates`) behind a "Refresh from TMI" fetch with a FileDrop upload fallback and a results Sheet; the Manual Entry screen gets Awards + Club Health forms plus the paste-minutes helper backed by CORE `extractMinutes`.

Implements ROADMAP Phase 3 (REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor), plan-doc Tasks 3.1, 3.2 and 3.3.

**Required design reference (read before any UI work):** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED — tokens A1–A3, A4 Kit components, screens A5.2–A5.3, data model B2 tmi/awards/health slices, B3 folder structure, B4 TMI integration boundary, Error handling) together with the phase design `docs/superpowers/specs/03-ingestion-phase-design.md` (TMI screen layout, form-control anatomy, CSV ingestion contract, Manual screen, sample-data file spec).

Purpose: the Area Director can get all weekly data into the app on a phone — TMI dashboard data via CSV (fetch or upload) and minutes data via structured forms with a paste-parse shortcut.
Output: updated `index.html` (CORE ingest functions + TMI/Manual screens + form kit) and `tests.html` (new CASES), plus new `sample-data/tmi-club-performance-sample.csv` (folder per design B3). No other files. No new dependencies (C4 — `fetch` is native; the only external reference stays the Phase 1 Chart.js CDN tag).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@docs/superpowers/specs/2026-06-11-area4-gamification-design.md
@docs/superpowers/specs/03-ingestion-phase-design.md
@docs/superpowers/plans/2026-06-11-area4-gamification-plan.md
@.planning/ROADMAP.md
@.planning/phases/03-ingestion/CONTEXT.md
@index.html
@tests.html
</context>

<interfaces>
Phases 1–2 already provide (do not re-implement):
- `window.A4 = { DEFAULT_STATE, loadState, saveState, computeScores, movementVs, areaTotals, saveSnapshot, toast, update }`
- Single mutation path `update(fn)` (mutate → `saveState` → `render()`); `render()` dispatcher keyed on `location.hash`; screen registry `SCREENS` with `renderTmi` / `renderManual` stubs to replace
- `openSheet({ title, bodyHtml, confirmLabel, onConfirm })` — generic bottom Sheet; `onConfirm(sheetEl)` returning `false` keeps it open; scrim/Cancel dismiss without side effects
- `showToast(msg)` (also `window.A4.toast`), `esc()` HTML escaper, `localToday()`
- Region markers `// === CORE ===` / `// === UI ===` in index.html (CORE must stay DOM-free — tests evaluate it with a stub window) and `// === CASES ===` / `// === END CASES ===` in tests.html (`runCases(A4, assertEq)`); 41 assertions currently green
- State slices per design B2: `state.tmi[clubId] = { base, current, goals: [0|1 x10], distinguished: ""|"D"|"S"|"P", duesOct, duesApr, officerList, cotRounds }`, `state.awards[clubId] = { smedley, talkUp, beatTheClock, tripleCrowns, areaWins, divWins, distWins }`, `state.health[clubId] = { meetings, attendancePct, guests, conversions }`, `state.lastTmiSync`

This phase adds to CORE (all pure, DOM-free, exported on `window.A4`):
- `parseCsv(text)` → array of string arrays
- `mapTmiCsv(rows, state)` → `{ updates: { [clubId]: tmiPatch }, matched: [...], unmatchedClubs: [clubName...], unmappedFields: [...], skippedRows: [...] }`
- `applyTmiUpdates(state, updates)` → `{ tmi, lastTmiSync }` (new tmi slice + ISO stamp; input state not mutated)
- `extractMinutes(text)` → `{ attendancePct?, guests?, conversions?, meetings? }` (keys present only when found)

UI-local (not persisted): one shared `selectedClubId` variable so the ClubPicker selection survives re-renders, used by both the TMI and Manual screens.

Workbook DCP goal definitions G1–G10 (chip labels and CSV thresholds — single source of truth for Tasks 1 and 2):
| Goal | Short label | CSV threshold (Task 2) |
|------|-------------|------------------------|
| G1 | 4 Level 1s | Level 1s ≥ 4 |
| G2 | 2 Level 2s | Level 2s ≥ 2 |
| G3 | 2 more L2s | Add. Level 2s ≥ 2 |
| G4 | 2 Level 3s | Level 3s ≥ 2 |
| G5 | 1 L4/L5/DTM | L4/L5/DTM ≥ 1 |
| G6 | 1 more L4+ | Add. L4/L5/DTM ≥ 1 |
| G7 | 4 new members | New Members ≥ 4 |
| G8 | 4 more new | Add. New Members ≥ 4 |
| G9 | Officers trained | both COT rounds ≥ 4 trained |
| G10 | Dues + officer list | (duesOct OR duesApr) AND officer list on time |
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: TMI Data screen — ClubPicker + FormRow/NumberStepper/ToggleChip kit + full per-club TMI form (plan-doc Task 3.1)</name>
  <files>index.html</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A4 Kit, A5.2, B2 tmi slice, Error handling clamps) and the "TMI screen layout" + "Form controls" sections of `docs/superpowers/specs/03-ingestion-phase-design.md`:

1. Form kit (A4 Kit, new CSS blocks, tokens only — these components are reused verbatim by the Manual screen in Task 3):
   - `ClubPicker`: horizontal scrollable row of club chips; active chip `--color-primary` background with `--color-surface` text, inactive chips `--color-surface` with `--color-text-muted` and a `--color-gray` border; chip height meets the B5 touch-target minimum via `--space-*` tokens. Selecting a chip sets the UI-local shared `selectedClubId` (NOT persisted state; defaults to the first club) and re-renders. One club's form on screen at a time — phones first.
   - `FormRow`: grid of label + control with `--space-3` vertical rhythm; labels at `--font-size-sm` weight 600.
   - `NumberStepper`: − / value / + control; each button a square touch target at the B5 minimum, `--radius-sm`, `--color-bg` background with `--color-primary` glyphs; the value is an inline-editable numeric input (`inputmode="numeric"`). Stepper takes min/max and writes through a callback.
   - `ToggleChip`: pill; off = `--color-bg` background with `--color-text-muted` text and `--color-gray` border, on = `--color-primary` background with `--color-surface` text. Accepts an optional accent variant where "on" uses `--color-accent` instead (used by the distinguished radio chips).

2. Replace the `renderTmi` stub with the full TMI Data screen: top sync panel containing the last-sync stamp ("Never synced" when `state.lastTmiSync` is null, otherwise the stamp formatted for humans) at `--font-size-xs` in `--color-text-muted` — leave a placeholder container in the sync panel for Task 2's Refresh button and FileDrop; then the ClubPicker; then the selected club's form:
   - Membership base + current: two FormRow numeric inputs, clamped 0–500 on change (Error handling section; clamp before the state write, per D-locked design).
   - 10 DCP goal ToggleChips in a 2-column wrap grid, labeled G1–G10 with the workbook short labels from the `<interfaces>` table; chip N toggles `state.tmi[clubId].goals[N-1]` between 0 and 1.
   - Distinguished status: 4 ToggleChips behaving as a radio group (None / D / S / P) using the `--color-accent` "on" variant to visually distinguish them from goal chips; writes `""`, `"D"`, `"S"`, or `"P"` to `state.tmi[clubId].distinguished`.
   - Dues Oct, Dues Apr, Officer list: three ToggleChips writing 0/1 to `duesOct` / `duesApr` / `officerList`.
   - COT rounds: NumberStepper clamped 0–2 writing `cotRounds`.

3. Every control commits through the existing `A4.update` single mutation path (mutate → `saveState` → `render()`), so each change persists immediately and survives reload. Bind free-text numeric inputs on the `change` event (not `input`) so the full re-render does not fight the phone keyboard mid-typing; chips and stepper buttons commit on click. All interpolated text goes through the existing `esc()` helper.

Constraints: only `index.html` changes in this task; no new dependencies; raw style values may appear only inside the existing `:root` token block — every component CSS declaration uses `var(--...)` tokens named above; CORE region untouched (this task is UI-only).
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'club-picker' index.html && grep -q 'inputmode' index.html</automated>
  </verify>
  <done>
- All 41 existing assertions still pass (headless runner exits 0 — no CORE regressions).
- In the browser, the TMI screen shows sync stamp, ClubPicker, and the selected club's full form; toggling a goal chip, setting distinguished to P, flipping dues chips, and stepping COT all survive a page reload (localStorage `idiff-area4-v1`); membership inputs entered as 9999 or −5 clamp to 500 / 0; switching clubs in the picker shows each club's own values.
- Commit checkpoint (conventional): `feat: TMI data entry screen`
  </done>
</task>

<task type="auto">
  <name>Task 2: TMI CSV ingestion — sample CSV, CORE parseCsv/mapTmiCsv/applyTmiUpdates, fetch + FileDrop fallback, results Sheet, mapping tests (plan-doc Task 3.2)</name>
  <files>index.html, tests.html, sample-data/tmi-club-performance-sample.csv</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (B4 TMI boundary — LOCKED, Error handling) and the "CSV ingestion contract" + "sample-data file" sections of `docs/superpowers/specs/03-ingestion-phase-design.md`:

1. Create `sample-data/tmi-club-performance-sample.csv` mirroring the real District 90 Club Performance export. Exact header set (the two L4/L5/DTM headers contain literal commas and MUST be quoted in the file): `District,Division,Area,Club Number,Club Name,Club Status,Mem. Base,Active Members,Goals Met,Level 1s,Level 2s,Add. Level 2s,Level 3s,"Level 4s, Level 5s, or DTM award","Add. Level 4s, Level 5s, or DTM award",New Members,Add. New Members,Off. Trained Round 1,Off. Trained Round 2,Mem. dues on time Oct,Mem. dues on time Apr,Off. List On Time,Club Distinguished Status`. Rows: all 6 Area 4 clubs plus 2 non-Area-4 decoy clubs, at least one decoy with a quoted club name containing a comma (e.g. `"Sydney CBD, Lunchtime Toastmasters"`). Deterministic cells the tests depend on: Quakers Hill uses its leading-zero club number `00009448`; Prospect Phoenix has club number `0` and name `Prospect Phoenix Toastmasters` (exercises name fallback); Marsden Park has `Level 1s` = 4 (G1 met) and `Mem. Base` 18 / `Active Members` 19; Quakers Hill has `Level 1s` = 3 (G1 NOT met) and both `Off. Trained` rounds ≥ 4 (G9 met); Blacktown City has `Club Distinguished Status` = `President's Distinguished` and dues Oct, dues Apr, and officer list all on time (G10 met). Remaining cells: realistic small values.

2. CORE — `parseCsv(text)` (pure, DOM-free, on `window.A4`): RFC-4180-ish parser returning an array of string arrays; handles quoted fields, embedded commas, escaped double quotes (`""`), CRLF and LF line endings; skips blank lines.

3. CORE — `mapTmiCsv(rows, state)` (pure, on `window.A4`), per the phase-design contract:
   - Header row located by scanning the first 5 rows for a cell whose normalized text matches `club name` (TMI exports carry preamble lines).
   - Club matching: club number first (string compare after stripping leading zeros; skip number matching when the state club number is null or the CSV cell is empty/`0`), then normalized name (lowercase, alphanumerics only, trailing `toastmasters`/`club` words stripped).
   - Field mapping via an ordered pattern table (first match wins) over case/punctuation-insensitive headers: mem+base → `base`; active → `current`; the ten per-goal source columns; off+trained rounds; dues Oct/Apr; officer list; distinguished status. CSV headers consumed by no pattern (District, Division, Area, Club Status, Goals Met — goals are derived from thresholds, never read from Goals Met) collect into `unmappedFields`.
   - Per-club `tmiPatch`: `base`/`current` as clamped numbers (0–500); `goals` array of 0|1 from the G1–G10 thresholds in the `<interfaces>` table; `distinguished` from the status column value's first letter P/S/D (case-insensitive prefix, e.g. "President's Distinguished" → "P"), else `""`; `duesOct`/`duesApr`/`officerList` as 0/1 (cell met when it parses truthy/positive); `cotRounds` = count of trained rounds with ≥ 4 officers (0–2).
   - Returns `{ updates, matched, unmatchedClubs, unmappedFields, skippedRows }`. NEVER throws: each data row is processed in a try/catch; malformed rows (e.g. wrong column count, unparseable cells) are recorded in `skippedRows`, not thrown (Error handling section). CSV rows matching no Area 4 club (the decoys) go to `unmatchedClubs` — reported, never silently dropped (B4).

4. CORE — `applyTmiUpdates(state, updates)` (pure, on `window.A4`): returns `{ tmi, lastTmiSync }` where `tmi` is a NEW slice with each club's patch merged over its existing tmi record (input state not mutated) and `lastTmiSync` is a fresh ISO string.

5. UI — sync panel wiring on the TMI screen (fills Task 1's placeholder):
   - "Refresh from TMI" primary button (`--color-primary`): `fetch` the B4 URL built from state — `https://dashboards.toastmasters.org/{programYear}/export.aspx?type=CSV&report=clubperformance~{district}~~~{programYear}` with `state.config.programYear` and `state.config.district` interpolated. On success pipe the text through `parseCsv` → `mapTmiCsv` → results Sheet. On ANY failure — fetch rejection, non-OK status, or a pipeline error (CORS is the expected case) — show an error Toast (add an error variant of the existing Toast styled with a `--color-error` accent) and auto-expand the FileDrop. Never a dead end.
   - `FileDrop` (A4 Kit, new CSS block, tokens only): dashed `--color-gray` border drop zone on `--color-surface`, collapsed by default in the sync panel, auto-expanded on fetch failure; contains step-by-step instructions ("open dashboards.toastmasters.org → District 90 → Club Performance → Export CSV, then drop the file here") at `--font-size-sm` in `--color-text-muted`, plus a `.csv` file input and dragover/drop handlers. Selected/dropped files run the exact same `parseCsv` → `mapTmiCsv` pipeline.
   - Results Sheet via the existing `openSheet`: lists updated clubs with their changed fields, unmatched clubs, unmapped headers, and skipped-row count — all interpolated CSV text escaped through `esc()` (CSV content is untrusted). Confirm runs `A4.update` applying `applyTmiUpdates(state, updates)` to `state.tmi` and `state.lastTmiSync`, then Toasts a success summary; Cancel discards everything. The sync stamp re-renders from the new `lastTmiSync`.

6. tests.html — add to the `// === CASES ===` region a fixture CSV string constant mirroring the sample file's headers and the deterministic rows above (the browser harness only receives `A4` + `assertEq`, so the fixture is embedded; keep it in sync with the sample file), then assert:
   (a) `parseCsv`: quoted field with embedded comma stays one cell; escaped double quotes unescape; CRLF input and blank lines handled;
   (b) `mapTmiCsv` fixture mapping: `updates` contains all 6 Area 4 club ids; both decoy names (including the quoted-comma one, intact) appear in `unmatchedClubs` and not in `updates`;
   (c) thresholds: Marsden Park `goals[0]` = 1 (Level 1s 4) and Quakers Hill `goals[0]` = 0 (Level 1s 3); Quakers Hill `goals[8]` = 1 (both rounds ≥ 4) and `cotRounds` = 2; Blacktown City `goals[9]` = 1 and `distinguished` = "P";
   (d) field mapping: Marsden Park `base` 18 and `current` 19;
   (e) name fallback: Prospect Phoenix (club number 0 in the CSV, null in state) present in `updates` via normalized-name match;
   (f) malformed-row tolerance: a fixture with one garbage data row → `mapTmiCsv` returns (does not throw) and reports the row in `skippedRows` while still mapping the valid rows;
   (g) `applyTmiUpdates`: returns a new tmi slice with the patch applied, a string `lastTmiSync`, and leaves the input state unmutated.

Constraints: only `index.html`, `tests.html`, and `sample-data/tmi-club-performance-sample.csv` change; no new dependencies (`fetch` is native — C4); CORE additions stay DOM-free; raw style values only inside `:root`; tokens named above are the only styling vocabulary.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'function mapTmiCsv' index.html && grep -q 'function applyTmiUpdates' index.html && grep -q 'Club Distinguished Status' sample-data/tmi-club-performance-sample.csv && grep -q '"' sample-data/tmi-club-performance-sample.csv</automated>
  </verify>
  <done>
- `window.A4.parseCsv`, `window.A4.mapTmiCsv`, `window.A4.applyTmiUpdates` exist in CORE; all new CSV cases plus all 41 prior assertions pass (headless runner exits 0).
- `sample-data/tmi-club-performance-sample.csv` exists with the exact plan-doc header set (quoted comma headers), 6 Area 4 rows (Prospect Phoenix number 0), and 2 decoys (one quoted-comma name).
- In the browser: "Refresh from TMI" against the real URL fails on CORS → error Toast + FileDrop auto-expands with instructions; dropping/choosing the sample CSV opens the results Sheet listing 6 updated clubs, 2 unmatched decoys, and the unmapped headers; Confirm updates the TMI forms (Marsden Park current 19, Blacktown City distinguished P) and the last-sync stamp; Cancel changes nothing.
- Commit checkpoint (conventional): `feat: TMI CSV ingestion with CORS fallback upload`
  </done>
</task>

<task type="auto">
  <name>Task 3: Manual Entry screen — Awards + Club Health forms, CORE extractMinutes + Sheet preview/prefill flow, extractor tests (plan-doc Task 3.3)</name>
  <files>index.html, tests.html</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A5.3, B2 awards/health slices, Error handling clamps) and the "Manual screen" section of `docs/superpowers/specs/03-ingestion-phase-design.md`:

1. Replace the `renderManual` stub with the full Manual Entry screen reusing Task 1's kit and the shared `selectedClubId`: ClubPicker on top, then two card sections on `--color-surface` with `--radius-md` and `--space-4` padding:
   - **Awards** — 7 FormRow + NumberStepper controls (min 0): Smedley, Talk Up, Beat the Clock, Triple Crowns, Area wins, Division wins, District wins → `state.awards[clubId].{smedley, talkUp, beatTheClock, tripleCrowns, areaWins, divWins, distWins}`.
   - **Club Health** — meetings held NumberStepper, avg attendance numeric input clamped 0–100 with a `%` suffix (`inputmode="numeric"`), guests NumberStepper, conversions NumberStepper → `state.health[clubId].{meetings, attendancePct, guests, conversions}`.
   All controls commit through `A4.update` (persist immediately, survive reload), numeric inputs bound on `change` as in Task 1.

2. Minutes helper card below Club Health: a textarea at `--font-size-sm` and an "Extract from minutes" secondary button styled as a `--color-accent` outline.

3. CORE — `extractMinutes(text)` (pure, DOM-free, on `window.A4`) → `{ attendancePct?, guests?, conversions?, meetings? }`, keys present only when found, using exactly the plan-doc regexes (case-insensitive):
   - attendance: `(\d{1,3})\s*%` OR `(\d+)\s*(?:of|\/)\s*(\d+)\s*members` — the of/slash form converts to a rounded whole percent, clamped 0–100;
   - guests: `(\d+)\s*guests?`;
   - conversions: `(\d+)\s*(?:guests?\s*)?(?:joined|converted|new member)`;
   - meetings: `(\d+)\s*meetings?`.
   Returns an empty object when nothing matches.

4. Extract flow: button runs `extractMinutes` on the textarea value. Nothing found → "Nothing found in that text" Toast, no Sheet, no changes. Otherwise open a Sheet (existing `openSheet`) previewing each found field and value (pasted-text fragments escaped through `esc()` if echoed); Confirm pre-fills the matching Club Health inputs in the DOM ONLY — no `A4.update`/`saveState` call — and flashes them with a `--color-yellow` background fade (CSS class transitioning back to normal, timed via a duration token in `:root`; reuse `--duration-fast` or add a new duration token there). Values commit through the existing auto-save-on-change inputs when the user reviews/confirms each one; Cancel discards. ROADMAP criterion: pre-fill for review WITHOUT auto-saving.

5. tests.html — add to the `// === CASES ===` region the plan-doc's 4 positive + 1 negative extractor cases:
   (a) `"12 of 18 members attended, 3 guests, 1 guest joined"` → `{ attendancePct: 67, guests: 3, conversions: 1 }` (12/18 rounded; first guests match wins; no meetings key);
   (b) `"Attendance was 80%"` → `{ attendancePct: 80 }`;
   (c) `"We held 4 meetings this month with 5 guests"` → `{ meetings: 4, guests: 5 }`;
   (d) `"1 new member joined after 90% attendance"` → `{ attendancePct: 90, conversions: 1 }`;
   (e) negative: `"The committee discussed the agenda at length."` → `{}` (drives the nothing-found Toast in the UI).

Constraints: only `index.html` and `tests.html` change; no new dependencies; CORE addition stays DOM-free; raw style values only inside `:root` — component CSS uses the tokens named above.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'function extractMinutes' index.html && grep -c 'extractMinutes' tests.html | grep -qv '^0$'</automated>
  </verify>
  <done>
- `window.A4.extractMinutes` exists in CORE; the 4 positive + 1 negative extractor cases plus all Task 1/2 and prior assertions pass (headless runner exits 0, zero failures).
- In the browser: Manual screen shows ClubPicker, 7 award steppers, and the Club Health section; values persist per club across reload; attendance entered as 250 clamps to 100; pasting case (a) and pressing Extract opens the preview Sheet, Confirm pre-fills attendance 67 / guests 3 / conversions 1 with a yellow flash WITHOUT writing state (reload before touching the inputs shows old values); pasting case (e) shows the nothing-found Toast.
- Commit checkpoint (conventional): `feat: manual entry for awards and club health with minutes extractor`
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| TMI dashboards response / uploaded CSV file → parseCsv/mapTmiCsv | Untrusted external content crosses into the parser and (after confirm) into persisted state |
| CSV-derived strings → results Sheet / TMI form DOM | Club names, headers, and skipped-row text interpolated into innerHTML |
| Pasted minutes text → extractMinutes / preview Sheet | Arbitrary user-pasted text crosses into the extractor and preview |
| Form inputs → state.tmi / state.awards / state.health | User-typed numbers cross into persisted scoring inputs |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Tampering | mapTmiCsv (malformed/hostile CSV rows) | mitigate | Per-row try/catch; malformed rows collected in `skippedRows` and reported in the results Sheet, never thrown and never silently dropped (design Error handling + B4) |
| T-03-02 | Tampering (stored XSS) | Results Sheet / extract preview / TMI & Manual screens innerHTML | mitigate | Every CSV- or paste-derived string routed through the existing `esc()` helper before interpolation |
| T-03-03 | Tampering | Numeric form inputs and CSV numeric cells | mitigate | Clamps enforced before any state write: membership 0–500, attendance 0–100, COT 0–2, steppers min 0 (design Error handling) |
| T-03-04 | Spoofing/Tampering | Fetched TMI response (network MITM / wrong endpoint) | mitigate | Fetched text goes through the same untrusted-CSV pipeline; nothing is applied to state without the results Sheet preview and explicit Confirm (B4: never auto-commit) |
| T-03-05 | Denial of Service | Oversized pasted/uploaded CSV | accept | Client-only app processing the user's own file on their own device; parser is single-pass linear and a bad parse only costs a reload — no shared resource at risk |
| T-03-SC | Tampering | npm/pip/cargo installs | n/a | No package-manager installs this phase (C4: no new dependencies; `fetch` is native) |
</threat_model>

<verification>
Run from the project root (`/Users/rajnaidu/Projects/area4-gamification`):

1. **Headless parity suite** — the node one-liner in each task's `<verify>` (extracts the CORE region from index.html and the CASES region from tests.html) exits 0 printing `N passed, 0 failed`, where N = the 41 Phase 1–2 assertions + the Phase 3 additions (CSV parsing/mapping/apply cases and the 5 extractor cases).
2. **Browser suite** — `python3 -m http.server` then open `http://localhost:8000/tests.html` (fetch of index.html is blocked from file://): summary line green, zero failures.
3. **TMI flow at 360px** — open `http://localhost:8000/index.html#tmi` in devtools responsive mode:
   - ClubPicker switches clubs; every field (base/current, G1–G10 chips, distinguished radio chips, dues Oct/Apr, officer list, COT stepper) saves on change and survives reload; base typed as 9999 clamps to 500.
   - "Refresh from TMI" → CORS failure → error Toast + FileDrop auto-expands with the step-by-step instructions (never a dead end).
   - Upload `sample-data/tmi-club-performance-sample.csv` → results Sheet shows 6 updated clubs (Prospect Phoenix matched by name), 2 unmatched decoys (quoted-comma name intact), unmapped headers list → Confirm updates forms + last-sync stamp; Cancel leaves state untouched.
4. **Manual flow at 360px** — `#manual`: 7 award steppers and Club Health values persist per club; attendance clamps 0–100; pasting "12 of 18 members attended, 3 guests, 1 guest joined" + Extract → preview Sheet → Confirm pre-fills attendance 67 / guests 3 / conversions 1 with a yellow flash and does NOT save until the user confirms via the inputs; unparseable text → nothing-found Toast.
5. **Token discipline** — `! sed '/:root {/,/^}/d' index.html | grep -qE '#[0-9A-Fa-f]{6}\b|[0-9]+px'` exits 0 (no raw hex/px outside the `:root` token block).
6. **Scope guard** — changes touch only `index.html`, `tests.html`, and `sample-data/tmi-club-performance-sample.csv` (C3); the only `<script src>` in index.html remains the Phase 1 Chart.js CDN tag — no new dependencies (C4).
</verification>

<success_criteria>
Mirrors ROADMAP Phase 3 success criteria — all must be TRUE:
1. On the TMI Data screen, every per-club field (membership base/current clamped 0–500, 10 DCP goal toggles, distinguished status, dues Oct/Apr, officer list, COT rounds 0–2) persists immediately on change and survives reload.
2. "Refresh from TMI" attempts the dashboards CSV fetch; on failure (CORS expected) the user sees a Toast and an automatically revealed FileDrop with step-by-step instructions — never a dead end.
3. Uploading the sample CSV updates all six clubs (including Prospect Phoenix via name fallback), ignores the two decoy clubs, parses quoted-comma names, applies workbook DCP goal thresholds, and shows a results Sheet (updated / unmatched / unmapped headers) before committing.
4. On the Manual Entry screen, all awards and club-health values persist per club, with attendance clamped to 0–100.
5. Pasting minutes text (e.g. "12 of 18 members attended, 3 guests, 1 guest joined") and pressing Extract pre-fills the Club Health form for review without auto-saving; unparseable text produces a "nothing found" Toast; the 4 positive + 1 negative extractor cases pass in tests.html.
Plus: all prior 41 assertions still pass (no regressions), and the three conventional commits exist (`feat: TMI data entry screen`, `feat: TMI CSV ingestion with CORS fallback upload`, `feat: manual entry for awards and club health with minutes extractor`).
</success_criteria>

<output>
Create `.planning/phases/03-ingestion/03-01-SUMMARY.md` when done (per `$HOME/.claude/gsd-core/templates/summary.md`).
</output>
