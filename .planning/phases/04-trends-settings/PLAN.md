---
phase: 04-trends-settings
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [index.html, tests.html, README.md]
autonomous: true
requirements: [REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-readme]
must_haves:
  truths:
    - "The Trends screen renders a Chart.js line of snapshot totals per club; with the CDN unreachable the same data appears as an HTML table and the rest of the app keeps working"
    - "The snapshot history list shows date + per-club totals with per-row delete behind a Sheet confirm"
    - "Editing any of the 21 weights/caps (clamped 0-100 integers) immediately changes leaderboard scores; club names/numbers (including filling in Prospect Phoenix) and program year are editable; Reset to seed data requires a Sheet confirm"
    - "Export downloads idiff-area4-backup-YYYY-MM-DD.json; importing it back shows a preview Sheet and restores state only on confirm; importing {} or version 99 shows explicit errors and leaves current state untouched"
    - "At 360px width there is no horizontal scroll on any of the five screens, touch targets meet the B5 minimum, index.html is <= 150KB excluding Chart.js, and README.md documents the weekly ritual end-to-end"
  artifacts:
    - path: "index.html"
      provides: "CORE pure function validateImport on window.A4; full renderTrends (token-palette Chart.js line + table fallback + empty states + history list with Sheet-confirmed delete) and renderSettings (5 SettingsList groups: weights, clubs, program year, backup export/import, danger zone); dvh shell sizing via a :root structural token"
      contains: "function validateImport"
    - path: "tests.html"
      provides: "CASES assertions for validateImport: accepts exported state, rejects empty object, rejects version 99, rejects non-numeric weight values"
      contains: "validateImport"
    - path: "README.md"
      provides: "Purpose, weekly ritual (refresh TMI -> minutes data -> snapshot -> share), GitHub Pages hosting, backup/restore, weights/club config, TMI CSV export instructions, tests.html note"
      contains: "GitHub Pages"
  key_links:
    - from: "renderTrends"
      to: "state.snapshots"
      via: "one Chart.js dataset per club built from snapshot scores, instance destroyed and rebuilt each render"
      pattern: 'new Chart\('
    - from: "chart series colors"
      to: ":root color tokens"
      via: "getComputedStyle read at render time in the phase-design palette order"
      pattern: 'getComputedStyle'
    - from: "Import JSON FileDrop"
      to: "CORE validateImport -> preview Sheet -> state replacement"
      via: "openSheet on ok:true; error Toast on ok:false with state untouched"
      pattern: 'validateImport\('
    - from: "weight inputs"
      to: "state.weights -> computeScores"
      via: "A4.update single mutation path (mutate -> saveState -> render)"
      pattern: 'weights\['
    - from: "tests.html CASES region"
      to: "window.A4.validateImport"
      via: "headless extraction of the CORE region markers"
      pattern: 'A4\.validateImport'
---

<objective>
Phase 4 (final) of i-Differentiate Area 4: the Trends screen (Chart.js line of snapshot totals per club with a token-derived palette, an HTML-table fallback when the CDN is unreachable, empty/single-snapshot states, and a snapshot history list with Sheet-confirmed delete), the Settings screen (five SettingsList groups: the 21 scoring weights/caps grouped per workbook, club names/numbers, program year, backup export/import backed by a new CORE `validateImport`, and a danger-zone reset), and the closing polish pass (dvh shell fix, 360px audit, touch-target audit, README).

Implements ROADMAP Phase 4 (REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-readme), plan-doc Tasks 4.1, 4.2 and 4.3.

**Required design reference (read before any UI work):** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED — tokens A1–A3, A4 Kit components, screens A5.4–A5.5, data model B2 weights/snapshots, B4 Chart.js + JSON export/import boundaries, B5 constraints, Error handling) together with the phase design `docs/superpowers/specs/04-trends-settings-phase-design.md` (trends chart palette order + destroy/rebuild + empty states, settings groups 1–5, `validateImport` contract, polish checklist).

Purpose: the full weekly ritual becomes shareable and durable — trends over time, tunable weights and club config, safe backup/restore, and a polished phone experience documented in the README.
Output: updated `index.html` (CORE `validateImport` + full Trends and Settings screens + polish) and `tests.html` (new CASES), plus new `README.md`. No other files (C3). No new dependencies — Chart.js 4.x UMD is already loaded from jsdelivr by the Phase 1 `<script defer>` tag and is the only external reference (C4).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@docs/superpowers/specs/2026-06-11-area4-gamification-design.md
@docs/superpowers/specs/04-trends-settings-phase-design.md
@docs/superpowers/plans/2026-06-11-area4-gamification-plan.md
@.planning/ROADMAP.md
@.planning/phases/04-trends-settings/CONTEXT.md
@index.html
@tests.html
</context>

<interfaces>
Phases 1–3 already provide (do not re-implement):
- `window.A4 = { DEFAULT_STATE, loadState, saveState, computeScores, movementVs, areaTotals, saveSnapshot, parseCsv, mapTmiCsv, applyTmiUpdates, extractMinutes, toast, update }`
- Single mutation path `update(fn)` (mutate → `saveState` → `render()`); `render()` dispatcher keyed on `location.hash`; screen registry `SCREENS` with `renderTrends` / `renderSettings` stubs to replace
- `openSheet({ title, bodyHtml, confirmLabel, onConfirm })` — generic bottom Sheet; `onConfirm(sheetEl)` returning `false` keeps it open; scrim/Cancel dismiss without side effects
- `showToast(msg, variant)` with `"error"` variant, `esc()` HTML escaper, `localToday()`, `deepMerge(target, source)` and `isPlainObject()` in CORE (the loadState merge path), `structuredClone`
- FileDrop A4 Kit CSS (`.file-drop`, `.file-drop-zone`, `.file-drop-steps`, drag styling) and the Phase 3 input/dragover/drop wiring pattern — reuse for JSON import
- Region markers `// === CORE ===` / `// === UI ===` in index.html (CORE must stay DOM-free — tests evaluate it with a stub window) and `// === CASES ===` / `// === END CASES ===` in tests.html (`runCases(A4, assertEq)`); 70 assertions currently green
- Snapshot schema per design B2: `state.snapshots = [{ date: "YYYY-MM-DD", scores: { [clubId]: { total, rank, breakdown } } }]`, capped at 60; leaderboard movement compares vs `snapshots[snapshots.length - 1]`
- Touch-target minimum met from spacing tokens via the established `calc` of `--space-6` + `--space-3` (B5)

This phase adds to CORE (pure, DOM-free, exported on `window.A4`):
- `validateImport(obj)` → `{ ok: true, summary: { clubCount, snapshotCount, lastTmiSync } }` | `{ ok: false, errors: [string...] }`. Checks in order: value is a plain object; `version === 1`; `config.clubs` is an array of length ≥ 1 whose entries all have string `id` and `name`; `weights` is a plain object whose values are all finite numbers; `snapshots`, if present, is an array. Every failed check appends a human-readable error; never throws.

Chart series palette (phase-design order — single source of truth; read at render time via `getComputedStyle(document.documentElement).getPropertyValue(...)`, one color per club in `state.config.clubs` order):
| Series | Token |
|--------|-------|
| 1 (marsden-park) | `--color-primary` |
| 2 (quakers-hill) | `--color-accent` |
| 3 (prospect-phoenix) | `--color-gold` |
| 4 (blacktown-city) | `--color-success` |
| 5 (rooty-hill) | `--color-silver` |
| 6 (holroyd) | `--color-bronze` |

The 21 weight keys, workbook grouping, and exact row labels (single source of truth for Task 2 — labels mirror the design-spec B2 formulas; groups and order per the phase design):
| Group | Key | Row label | Default |
|-------|-----|-----------|---------|
| DCP | dcpGoal | Per DCP goal met | 5 |
| DCP | distD | Distinguished (D) | 10 |
| DCP | distS | Select Distinguished (S) | 15 |
| DCP | distP | President's Distinguished (P) | 25 |
| Membership | memberGrowth | Per net member gained/lost | 2 |
| Membership | memberBonus20 | Bonus at 20+ members | 5 |
| Admin & Deadlines | duesOnTime | Dues on time (per round) | 5 |
| Admin & Deadlines | officerList | Officer list on time | 5 |
| Admin & Deadlines | cotRound | Per COT round completed | 5 |
| Awards | d90Award | Per D90 award (Smedley / Talk Up / Beat the Clock) | 5 |
| Awards | tripleCrown | Per Triple Crown | 5 |
| Awards | contestArea | Per Area contest win | 3 |
| Awards | contestDivision | Per Division contest win | 5 |
| Awards | contestDistrict | Per District contest win | 10 |
| Club Health | attendance75 | Attendance 75%+ | 5 |
| Club Health | attendance50 | Attendance 50–74% | 3 |
| Club Health | perGuest | Per guest | 1 |
| Club Health | guestCap | Guest points cap | 10 |
| Club Health | perConversion | Per guest who joined | 5 |
| Club Health | perMeeting | Per meeting held | 1 |
| Club Health | meetingCap | Meeting points cap | 5 |
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Trends screen — token-palette Chart.js line, table fallback, empty states, snapshot history with Sheet-confirmed delete (plan-doc Task 4.1)</name>
  <files>index.html</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A5.4, B4 Chart.js CDN boundary — LOCKED, B5 offline tolerance) and the "Trends screen" section of `docs/superpowers/specs/04-trends-settings-phase-design.md`:

1. Replace the `renderTrends` stub with the full Trends screen. Chart card on `--color-surface` with `--radius-md` and `--space-4` padding containing a `<canvas>`. Build the data once from `state.snapshots`: x = snapshot dates in stored order, one dataset per club in `state.config.clubs` order with `data` = that club's `scores[clubId].total` per snapshot. Series colors come from the fixed 6-entry token palette in the `<interfaces>` table, read at render time via `getComputedStyle(document.documentElement).getPropertyValue(...).trim()` — never hardcode color values in JS. Legend at the bottom with its label size parsed from the `--font-size-xs` token (same getComputedStyle read). Keep one UI-local chart-instance variable: on every `renderTrends` call, if an instance exists call its `destroy()` before constructing `new Chart(...)` (phase design: avoids canvas leak on tab switches; `update()` re-renders make this path hot).

2. Feature-detect `window.Chart` at render time. When absent (CDN unreachable — `defer` script never loaded), render the SAME data as an HTML table inside the chart card: one row per snapshot date, one column per club, wrapped in a horizontally scrollable container (overflow on the wrapper, not the page) so the 360px no-horizontal-scroll rule holds; cells at `--font-size-sm`, headers weight 600. Below it a muted note at `--font-size-xs` in `--color-text-muted` that the chart needs a network connection once. The rest of the app must keep working either way — no references to `Chart` outside the feature-detected branch.

3. Empty/sparse states (phase design): 0 snapshots → no canvas/table; a friendly card on `--color-surface` reading "No snapshots yet — save one from the Leaderboard" at `--font-size-sm` in `--color-text-muted`. Exactly 1 snapshot → render the chart anyway (Chart.js draws single-point datasets fine; no special casing beyond letting it through).

4. Snapshot history list below the chart card: one row per snapshot, newest first, each showing the date (weight 600), the per-club totals (compact club label + total pairs at `--font-size-xs` in `--color-text-muted` — ROADMAP criterion 2 requires per-club totals on the row) and the Area total, plus a "Delete" text button in `--color-error` at `--font-size-sm` whose tap target meets the B5 minimum via the established `--space-6` + `--space-3` calc. Delete opens the existing `openSheet` ("Delete snapshot {date}?", body restating the date and Area total, confirm label "Delete"); Confirm removes that entry from `state.snapshots` through a single `A4.update` call (leaderboard movement automatically recomputes against the new latest snapshot); Cancel changes nothing. All interpolated dates/names go through `esc()`.

Constraints: only `index.html` changes in this task; CORE region untouched (this task is UI-only); no new dependencies (C4 — Chart.js is already loaded by the Phase 1 tag); raw style values only inside `:root` — every new CSS declaration uses the `var(--...)` tokens named above.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'new Chart(' index.html && grep -q 'window.Chart' index.html && grep -q 'getComputedStyle' index.html && grep -q 'No snapshots yet' index.html</automated>
  </verify>
  <done>
- All 70 existing assertions still pass (headless runner exits 0 — no CORE regressions).
- In the browser with snapshots saved: Trends shows a line chart with one series per club colored from the token palette and a bottom legend; switching tabs back and forth never duplicates or blanks the canvas (destroy/rebuild). With jsdelivr blocked (devtools request blocking) the same data renders as the scrollable table + muted note and every other screen still works. With localStorage cleared: the "No snapshots yet — save one from the Leaderboard" card. With exactly 1 snapshot: chart renders points.
- History rows show date, per-club totals, Area total; Delete opens the Sheet, Confirm removes the row and leaderboard movement now compares against the new latest snapshot, Cancel changes nothing.
- Commit checkpoint (conventional): `feat: trends chart with snapshot history`
  </done>
</task>

<task type="auto">
  <name>Task 2: Settings screen — 5 SettingsList groups (weights, clubs, program year, backup export/import via CORE validateImport, danger zone) + import-validation tests (plan-doc Task 4.2)</name>
  <files>index.html, tests.html</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A5.5, B2 weights, B4 JSON export/import boundary — LOCKED, B5 data safety, Error handling) and the "Settings screen" + "New CORE functions" sections of `docs/superpowers/specs/04-trends-settings-phase-design.md`:

1. CORE — `validateImport(obj)` (pure, DOM-free, on `window.A4`) exactly per the `<interfaces>` contract: plain object, `version === 1`, `config.clubs` array length ≥ 1 with string `id` + `name` on every entry, `weights` a plain object with all-finite-numeric values, `snapshots` an array if present. Returns `{ok: true, summary: {clubCount, snapshotCount, lastTmiSync}}` (snapshotCount 0 when the slice is absent; lastTmiSync passed through, null when absent) or `{ok: false, errors: [...]}` with one human-readable string per failed check. Never throws on any input.

2. Replace the `renderSettings` stub with SettingsList: five surface cards (`--color-surface`, `--radius-md`, `--space-4` padding) in phase-design order, each with a group caption at `--font-size-sm` weight 600:
   - **Scoring weights** — the five sub-groups and exact row labels from the `<interfaces>` weight table (DCP, Membership, Admin & Deadlines, Awards, Club Health; sub-group captions at `--font-size-xs` in `--color-text-muted`). Each row reuses FormRow with a numeric input (`inputmode="numeric"`) bound to its weight key: on `change`, parse int, clamp 0–100 (Error handling), revert the field to the current state value when unparseable, and commit via `A4.update` so leaderboard scores change immediately.
   - **Clubs** — per club a name text input (trimmed on change; an emptied field reverts to the current name, no write) and a club number input (`inputmode="numeric"`, non-digits stripped; empty commits `null` per the design's Prospect Phoenix decision). While `prospect-phoenix` has a null number, show a hint chip next to its row ("Club number TBC — add it here") styled like the mover chip: `--color-yellow` background, `--color-text` text, `--font-size-xs`, `--radius-lg`.
   - **Program year** — a `<select>` with options 2025-2026 / 2026-2027 / 2027-2028 bound to `state.config.programYear` via `A4.update` (it drives the TMI fetch URL already interpolated on the TMI screen).
   - **Backup** — "Export JSON" primary button (`--color-primary`): serialize the full live state to a Blob, download as `idiff-area4-backup-YYYY-MM-DD.json` using `localToday()` for the date, via a temporary object-URL anchor (revoke after click). Below it an always-visible JSON FileDrop reusing the Phase 3 `.file-drop` kit classes (`.json` input + dragover/drop): read the file, `JSON.parse` in try/catch (parse failure → error Toast, state untouched), then `validateImport`. On `ok: false` → error Toast listing the errors (escaped through `esc()`), state untouched. On `ok: true` → preview Sheet via `openSheet` showing club count, snapshot count, and last TMI sync ("never" when null); Confirm builds the restored state as `deepMerge(structuredClone(DEFAULT_STATE), importedObj)` (the loadState path — missing slices fall back to defaults, unknown keys preserved) and swaps it in through one `update()` call that replaces every top-level key on the existing state object (so all closures keep pointing at the same object), then Toasts a success summary; Cancel discards everything.
   - **Danger zone** — "Reset to seed data" button styled as a `--color-error` outline (mirror the `.btn-accent-outline` anatomy with error tokens). Opens a Sheet warning that all data will be replaced; Confirm replaces every top-level key with a `structuredClone(DEFAULT_STATE)` copy through one `update()` call and Toasts; Cancel changes nothing.
   All controls meet the B5 touch-target minimum via the established spacing-token calc; numeric inputs bind on `change` (not `input`) so re-renders never fight the phone keyboard.

3. tests.html — add to the `// === CASES ===` region (driving `A4.validateImport`):
   (a) accepts exported state: `validateImport(structuredClone(DEFAULT_STATE))` → `{ok: true, summary: {clubCount: 6, snapshotCount: 0, lastTmiSync: null}}` (export writes the full state, so the default state is its exact shape);
   (b) rejects empty object: `validateImport({})` → `ok` is `false` and `errors.length > 0`;
   (c) rejects version 99: a default-state clone with `version: 99` → `ok` is `false`;
   (d) weight-type check: a default-state clone with one weight value set to the string form of a number → `ok` is `false`;
   (e) snapshots-shape check: a default-state clone with `snapshots` set to a non-array → `ok` is `false`.

Constraints: only `index.html` and `tests.html` change in this task; CORE addition stays DOM-free; no new dependencies (C4 — Blob/object URLs are native); raw style values only inside `:root` — the tokens named above are the only styling vocabulary.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'function validateImport' index.html && grep -q 'A4.validateImport' tests.html && grep -q 'idiff-area4-backup-' index.html</automated>
  </verify>
  <done>
- `window.A4.validateImport` exists in CORE; the 5 new import-validation cases plus all 70 prior assertions pass (headless runner exits 0, zero failures).
- In the browser: editing "Per DCP goal met" from 5 to 10 immediately changes leaderboard totals for clubs with goals met; weight typed as 250 clamps to 100; Prospect Phoenix shows the hint chip until a number is entered, and clearing a club number stores null; program year select persists and changes the TMI fetch URL; Export downloads the dated JSON file; re-importing it shows the preview Sheet (6 clubs, snapshot count, last sync) and Confirm restores state with a full re-render; importing a file containing `{}` or version 99 shows an explicit error Toast and leaves current state untouched; Reset to seed data requires the Sheet confirm and restores the Phase 1 seed.
- Commit checkpoint (conventional): `feat: settings, weight editor, JSON export/import`
  </done>
</task>

<task type="auto">
  <name>Task 3: Mobile polish (dvh shell, 360px + touch-target audits) + README; full suite green (plan-doc Task 4.3)</name>
  <files>index.html, README.md</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (B3 folder structure, B5 constraints — LOCKED) and the "Polish checklist" section of `docs/superpowers/specs/04-trends-settings-phase-design.md`:

1. Shell sizing fix (phase-design checklist line: "min-height: 100dvh shell with fallback for WhatsApp in-app browser; no fixed 100vh traps"): add a structural helper token `--shell-min-height` to the `:root` block set to the full-viewport-height fallback value, re-declared to the dynamic-viewport-height value inside an `@supports` guard for the dynamic unit (raw values stay in `:root` declarations only), and apply `min-height: var(--shell-min-height)` to `body` so short screens still pin the bg/tab-bar correctly in the WhatsApp in-app browser. No fixed-height viewport traps anywhere.

2. 360px audit of all five screens (`#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`) in devtools responsive mode: `document.documentElement.scrollWidth` must not exceed the viewport width on any screen, including with the breakdown accordion open, the FileDrop expanded, the trends fallback table showing (its overflow must stay on the wrapper), the import preview Sheet open, and the longest club name rendered. Fix any offender with token-based CSS (wrapping, `overflow-wrap`, min-width zero on flex children) — never by shrinking type below its token size.

3. Touch-target audit per the checklist: tabs, ClubPicker chips, ToggleChips, NumberStepper buttons, history Delete buttons, Sheet actions, and all Settings controls meet the B5 minimum via the established `--space-6` + `--space-3` spacing calc; verify the breakdown accordion still animates within the `--duration-fast` cap.

4. Create `README.md` with these sections (phase-design checklist): what the app is (single-file leaderboard replacing the Area 4 workbook; design doc lives at `docs/superpowers/specs/2026-06-11-area4-gamification-design.md`); the weekly ritual end-to-end (refresh TMI → update minutes data on Manual Entry → save weekly snapshot → share the link); hosting on GitHub Pages step-by-step (and that `file://` also works minus the TMI fetch); backup/restore (export file naming, import preview, explicit-error behavior); editing weights and club config (including filling in the Prospect Phoenix club number); how to export the TMI Club Performance CSV from dashboards.toastmasters.org when CORS blocks the fetch; and a note that `tests.html` is the unshipped parity suite served over http.

5. Run the full suite (headless runner and `tests.html` in the browser over http): all assertions green, zero failures. Confirm `index.html` stays ≤ 150KB excluding Chart.js (the CDN tag is the only external reference — C4).

Constraints: only `index.html` and `README.md` change in this task (C3); no new dependencies; raw style values only inside `:root` token declarations.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'shell-min-height' index.html && grep -q 'dvh' index.html && [ "$(wc -c < index.html)" -le 153600 ] && grep -qi 'GitHub Pages' README.md && grep -qi 'backup' README.md && grep -qi 'snapshot' README.md && grep -q 'tests.html' README.md</automated>
  </verify>
  <done>
- Full suite green: headless runner exits 0 with all Phase 1–4 assertions passing (70 prior + the Task 2 import cases); browser `tests.html` summary shows zero failures.
- `body` min-height flows through the `--shell-min-height` token with the dynamic-viewport re-declaration; at 360px none of the five screens horizontally scroll in any state listed above; every interactive control meets the B5 touch-target minimum.
- `README.md` exists with all seven content areas from the phase-design checklist; `index.html` ≤ 150KB excluding Chart.js.
- Commit checkpoint (conventional): `docs: README and mobile polish`
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Imported JSON file → validateImport → full state replacement | An untrusted file can replace the entire persisted AppState |
| Import-derived strings (errors, summary, club names) → Toast/Sheet/screen innerHTML | File content interpolated into the DOM |
| Settings inputs (club names, numbers, weights) → state.config/state.weights | User-typed values persist and render on every screen and in the chart legend |
| Snapshot dates/data → Trends chart, fallback table, history list | Stored state interpolated into Trends DOM |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Tampering | Imported JSON → state | mitigate | `JSON.parse` in try/catch; `validateImport` schema checks (version, clubs, weights types, snapshots shape); preview Sheet + explicit Confirm before any write; rejected import leaves state untouched (design Error handling + B4) |
| T-04-02 | Tampering (stored XSS) | Import errors/summary, club names, snapshot dates in innerHTML | mitigate | Every file- or state-derived string routed through the existing `esc()` helper before interpolation (Trends, Settings, Sheets, Toasts) |
| T-04-03 | Tampering | Weight/club-number inputs | mitigate | Clamps and sanitizers before any state write: weights 0–100 integers, club numbers digits-or-null, unparseable input reverts (design Error handling) |
| T-04-04 | Denial of Service | Destructive actions (snapshot delete, reset, import overwrite) | mitigate | Each gated behind a Sheet confirm; export provides a dated backup path before risky operations (B5 data safety) |
| T-04-05 | Information Disclosure | Exported backup file contents | accept | Client-only app; export contains only club-level aggregates the user already owns — no PII, no secrets (design: "no PII beyond club-level aggregates") |
| T-04-06 | Spoofing/Tampering | Chart.js CDN script | accept+mitigate | Existing Phase 1 `defer` tag (no new dependency — C4); app feature-detects `window.Chart` and fully functions without it, so a blocked/failed CDN never breaks the app (B4) |
| T-04-SC | Tampering | npm/pip/cargo installs | n/a | No package-manager installs this phase (C4: no new dependencies) |
</threat_model>

<verification>
Run from the project root (`/Users/rajnaidu/Projects/area4-gamification`):

1. **Headless parity suite** — the node one-liner in each task's `<verify>` (extracts the CORE region from index.html and the CASES region from tests.html) exits 0 printing `N passed, 0 failed`, where N = the 70 Phase 1–3 assertions + the Phase 4 import-validation cases (≥ 74 total).
2. **Browser suite** — `python3 -m http.server` then open `http://localhost:8000/tests.html` (fetch of index.html is blocked from file://): summary line green, zero failures.
3. **Trends flow at 360px** — `http://localhost:8000/index.html#trends` in devtools responsive mode: with snapshots, the line chart renders one token-palette series per club with bottom legend, and repeated tab switches never leak/blank the canvas; with jsdelivr blocked via request blocking, the same data appears as the scrollable table + muted note and every other screen still works; with 0 snapshots the "No snapshots yet" card shows; with 1 snapshot the chart renders points; history rows show date + per-club totals + Area total and delete only after the Sheet confirm, after which leaderboard movement tracks the new latest snapshot.
4. **Settings flow at 360px** — `#settings`: all 21 weight rows present under the five workbook groups with the exact labels; editing a weight immediately changes leaderboard scores and out-of-range input clamps 0–100; club names/numbers editable with Prospect Phoenix hint chip and empty-number → null; program year select drives the TMI URL; Export downloads `idiff-area4-backup-YYYY-MM-DD.json`; re-import shows the preview Sheet and restores only on Confirm; files containing `{}` or `version: 99` produce explicit error Toasts with state untouched; Reset to seed data requires the Sheet confirm.
5. **Polish** — at 360px no horizontal scroll on any of the five screens (`document.documentElement.scrollWidth` ≤ viewport width, including accordion open, FileDrop expanded, fallback table, Sheets open); all touch targets meet the B5 minimum; body min-height flows through the `--shell-min-height` token with the dynamic-viewport re-declaration (no fixed viewport-height traps).
6. **Token discipline** — `! sed '/:root {/,/^}/d' index.html | grep -qE '#[0-9A-Fa-f]{6}\b|[0-9]+px'` exits 0 (no raw hex/px outside `:root` token declarations).
7. **Size + scope guard** — `[ "$(wc -c < index.html)" -le 153600 ]` (≤ 150KB excluding Chart.js); changes touch only `index.html`, `tests.html`, and `README.md` (C3); the only `<script src>` in index.html remains the Phase 1 Chart.js CDN tag — no new dependencies (C4).
8. **README** — documents the weekly ritual end-to-end (refresh TMI → minutes data → snapshot → share), GitHub Pages hosting, backup/restore, weights/club config, TMI CSV export instructions, and the tests.html note.
</verification>

<success_criteria>
Mirrors ROADMAP Phase 4 success criteria — all must be TRUE:
1. The Trends screen renders a Chart.js line of snapshot totals per club; with the CDN unreachable the same data appears as an HTML table, and the rest of the app keeps working.
2. The snapshot history list shows date + per-club totals with per-row delete behind a Sheet confirm.
3. In Settings, editing any of the 21 weights/caps (clamped 0–100 integers) immediately changes leaderboard scores; club names/numbers (including filling in Prospect Phoenix) and program year are editable; "Reset to seed data" requires a Sheet confirm.
4. Export downloads `idiff-area4-backup-YYYY-MM-DD.json`; importing it back shows a preview Sheet and restores state only on confirm; importing `{}` or version 99 shows explicit errors and leaves current state untouched.
5. At 360px width there is no horizontal scroll on any screen, touch targets are ≥ the B5 minimum, `index.html` is ≤ 150KB excluding Chart.js, and README.md documents the weekly ritual end-to-end (refresh TMI → minutes data → snapshot → share).
Plus: all 70 prior assertions still pass (no regressions), and the three conventional commits exist (`feat: trends chart with snapshot history`, `feat: settings, weight editor, JSON export/import`, `docs: README and mobile polish`).
</success_criteria>

<output>
Create `.planning/phases/04-trends-settings/04-01-SUMMARY.md` when done (per `$HOME/.claude/gsd-core/templates/summary.md`).
</output>
