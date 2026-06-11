---
phase: 02-leaderboard
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [index.html, tests.html]
autonomous: true
requirements: [REQ-leaderboard, REQ-snapshots]
must_haves:
  truths:
    - "All six clubs render sorted by rank, with gold/silver/bronze medal styling on the top-3 cards"
    - "Tapping a club card expands a six-category breakdown (DCP, Distinguished, Membership, Admin, Awards, Club Health); tapping again collapses it"
    - "Every card shows a movement arrow paired with signed delta text (never color-only); before any snapshot exists it reads as the muted no-snapshot dash"
    - "Callout chips show Leading Club, Biggest Mover (em dash when no snapshot), and Area Total"
    - "Save weekly snapshot opens a confirm Sheet with an editable date defaulting to today; after confirming and changing club data, every club shows correct scoreDelta and rankDelta versus that snapshot"
    - "Snapshots prune to 60 entries (oldest removed) and a same-date save replaces the existing entry instead of duplicating"
  artifacts:
    - path: "index.html"
      provides: "CORE saveSnapshot/areaTotals pure helpers on window.A4; ClubCard, ScoreBreakdown, CalloutChip, Sheet render code"
      contains: "function saveSnapshot"
    - path: "tests.html"
      provides: "CASES assertions for areaTotals and saveSnapshot (append, purity, same-date replace, prune-to-60) plus movement-vs-saved-snapshot parity"
      contains: "saveSnapshot"
  key_links:
    - from: "renderLeaderboard"
      to: "state.snapshots[last]"
      via: "movement computed against the latest stored snapshot"
      pattern: 'movementVs\('
    - from: "Sheet confirm handler"
      to: "CORE saveSnapshot"
      via: "A4.update writes the saveSnapshot(state, date) result into state.snapshots"
      pattern: 'saveSnapshot\('
    - from: "tests.html CASES region"
      to: "window.A4.saveSnapshot / window.A4.areaTotals"
      via: "headless extraction of the CORE region markers"
      pattern: 'A4\.saveSnapshot'
---

<objective>
Phase 2 of i-Differentiate Area 4: turn the Phase 1 placeholder leaderboard into the full ranked, explainable home screen (ClubCards with medals and movement, tap-to-expand ScoreBreakdown, CalloutChips), and add the manual weekly snapshot system (pure `saveSnapshot` CORE helper with same-date replace and prune-to-60, Sheet confirm with editable date, movement deltas versus the latest snapshot).

Implements ROADMAP Phase 2 (REQ-leaderboard, REQ-snapshots), plan-doc Tasks 2.1 and 2.2.

**Required design reference (read before any UI work):** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED — tokens A1–A3, A4 Kit components, screen A5.1, data model B2, constraints B5) together with the phase design `docs/superpowers/specs/02-leaderboard-phase-design.md` (ClubCard anatomy, movement display, ScoreBreakdown, CalloutChips, snapshot flow, new CORE helpers).

Purpose: members get a leaderboard that explains itself on a phone; the Area Director gets the workbook's copy-to-Previous weekly ritual as one button.
Output: updated `index.html` (CORE helpers + leaderboard UI) and `tests.html` (new CASES). No other files. No new dependencies (Chart.js CDN tag from Phase 1 remains the only external reference; nothing is added).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@docs/superpowers/specs/2026-06-11-area4-gamification-design.md
@docs/superpowers/specs/02-leaderboard-phase-design.md
@docs/superpowers/plans/2026-06-11-area4-gamification-plan.md
@.planning/ROADMAP.md
@.planning/phases/02-leaderboard/CONTEXT.md
@index.html
@tests.html
</context>

<interfaces>
Phase 1 already provides (do not re-implement):
- `window.A4 = { DEFAULT_STATE, loadState, saveState, computeScores, movementVs, toast, update }`
- `computeScores(state) -> { [clubId]: { breakdown: {dcp, dist, membership, admin, awards, health}, total, rank } }` (Excel RANK tie semantics)
- `movementVs(snapshot, scores) -> { [clubId]: { scoreDelta, rankDelta } }` — `{ scoreDelta: 0, rankDelta: null }` when snapshot is null or club missing
- Single mutation path `update(fn)` (mutate → `saveState` → `render()`), `render()` dispatcher keyed on `location.hash`, `esc()` HTML escaper, `showToast`
- Region markers `// === CORE ===` / `// === UI ===` in index.html (CORE must stay DOM-free — tests evaluate it with a stub window) and `// === CASES ===` / `// === END CASES ===` in tests.html (`runCases(A4, assertEq)`)

This phase adds to CORE: `saveSnapshot(state, date)` and `areaTotals(scores)`, both exposed on `window.A4`.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Leaderboard screen — ClubCard, ScoreBreakdown accordion, CalloutChips, sorted render (plan-doc Task 2.1)</name>
  <files>index.html, tests.html</files>
  <action>
Per `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A1–A4, A5.1, B5) and the ClubCard/ScoreBreakdown/CalloutChips sections of `docs/superpowers/specs/02-leaderboard-phase-design.md`:

1. CORE: add pure helper `areaTotals(scores)` returning the sum of `total` across all clubs. No DOM access (CORE is evaluated headlessly). Export it on `window.A4` alongside the existing functions.

2. ClubCard (extend the existing `.club-card` CSS block; surface stays `--color-surface`, `--radius-sm`, `--space-3` padding): an `<article class="club-card">` acting as the whole-card tap target — `role="button"`, `tabindex` 0, `aria-expanded`, activated by click and by Enter/Space. Contents: circular rank badge (numeral at `--font-size-lg`; ranks 1/2/3 get `--color-gold`/`--color-silver`/`--color-bronze` backgrounds with a `--color-surface` numeral; other ranks get `--color-bg` background with `--color-text-muted` numeral); name block (club name at `--font-size-lg` weight 600, movement line beneath at `--font-size-xs`); right-aligned score block (total at `--font-size-2xl` weight 700 in `--color-primary`). Top-3 cards also get a subtle left border in their medal color token. Card and badge dimensions must satisfy the B5 touch-target minimum using `--space-*` tokens only.

3. Movement display: compute `movementVs(state.snapshots[state.snapshots.length - 1] || null, scores)`. Movement line variants: up arrow + signed delta + "since last snapshot" in `--color-success`; down arrow + signed delta in `--color-error`; dash + "no change" (snapshot exists, delta zero) or dash + "no snapshot yet" (no snapshot) in `--color-text-muted`. Arrows are ALWAYS paired with signed text — never color-only (B5 accessibility). Rank-movement chip on the badge corner only when `rankDelta` is nonzero (signed value, e.g. +1 / −2), styled with `--font-size-xs` on `--color-yellow` for up and `--color-gray` for down.

4. ScoreBreakdown accordion inside the card: six rows — DCP, Distinguished, Membership, Admin, Awards, Club Health — label + points at `--font-size-sm` with `--space-3` row padding; row separators use `--color-gray` softened via color-mix at the opacity given in the phase design; zero-point rows render in `--color-text-muted`; a footer row repeats the total at weight 700. Expand/collapse animates with a max-height transition kept within the duration cap stated in the phase design. Keep a UI-local `expandedClubId` variable (NOT persisted state) so full re-renders preserve the open card; tapping toggles the `.expanded` class and `aria-expanded` directly so the transition actually animates.

5. CalloutChips row above the cards (wraps at narrow widths, gap `--space-2`, each chip rounded with `--radius-lg`, padded `--space-2` `--space-3`): Leading Club (`--color-primary` background, `--color-surface` text, rank-1 club name — on rank ties show the first by club order); Biggest Mover (`--color-yellow` background, `--color-text` text; club name + signed delta for the largest strictly positive scoreDelta; an em dash when no snapshot exists or no club has a positive delta); Area Total (`--color-surface` background, `--color-gray` border, value from `areaTotals(scores)`). Chip anatomy: uppercase label at `--font-size-xs` + value at `--font-size-sm` weight 600.

6. Replace the Phase 1 minimal `renderLeaderboard` with this full version: chips row, then cards sorted by rank ascending, re-rendered through the existing `render()` dispatcher and `A4.update` path. All interpolated text goes through the existing `esc()` helper. Leave room below the cards for Task 2's snapshot button.

7. tests.html — add to the `// === CASES ===` region: (a) "areaTotals: seed scores sum to 10" (Quakers Hill 5 + Blacktown City 5); (b) "areaTotals: full-house blacktown state sums to 181" (reuse the existing full-house fixture: 176 + the two seed bonuses minus blacktown's own seed 5).

Constraints: only `index.html` and `tests.html` change; no new dependencies; raw style values may appear only inside the existing `:root` token block — every declaration in component CSS uses `var(--...)` tokens named above.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'areaTotals' index.html && grep -q 'role="button"' index.html</automated>
  </verify>
  <done>
- `window.A4.areaTotals` exists in CORE and both new areaTotals assertions pass alongside all 32 existing assertions (headless runner exits 0).
- Leaderboard renders chips row + six cards sorted by rank; top-3 medal styling uses `--color-gold`/`--color-silver`/`--color-bronze`; card tap toggles a six-category breakdown with `aria-expanded`; movement lines show dash + "no snapshot yet" on seed state; Biggest Mover shows an em dash.
- Commit checkpoint (conventional): `feat: leaderboard with club cards, breakdowns, callouts`
  </done>
</task>

<task type="auto">
  <name>Task 2: Snapshot system — saveSnapshot CORE helper, Sheet confirm flow, movement parity tests (plan-doc Task 2.2)</name>
  <files>index.html, tests.html</files>
  <action>
Per the snapshot-flow and state-shape sections of `docs/superpowers/specs/02-leaderboard-phase-design.md` and B2/B5 of `docs/superpowers/specs/2026-06-11-area4-gamification-design.md`:

1. CORE: add pure helper `saveSnapshot(state, date)` returning a NEW snapshots array (input `state` and its `snapshots` array must not be mutated): build entry `{ date, scores: computeScores(state) }` (full computeScores output — breakdown, total, rank per club); if an existing snapshot has the identical date string, replace that entry in place; otherwise append; if the result exceeds 60 entries, drop from the front (oldest) until 60 remain (B5 data-safety). Export on `window.A4`.

2. Sheet component (A4 Kit, new CSS block, tokens only): fixed bottom sheet on `--color-surface` with top corners at `--radius-lg` and `--space-4` padding, sitting above a translucent scrim derived from `--color-text` via color-mix; scrim tap and Cancel both dismiss without writing state. Sheet title at `--font-size-lg` weight 600.

3. "Save weekly snapshot" button: full-width primary button below the cards on the Leaderboard screen — `--color-primary` background, `--color-surface` text, `--font-size-base` weight 600, `--radius-md`, `--space-3` vertical padding (meets the B5 touch-target minimum). Tapping opens the Sheet containing: a date input (`type="date"`) defaulting to TODAY IN LOCAL TIME (build the YYYY-MM-DD string from getFullYear/getMonth/getDate — do NOT use toISOString, which yields yesterday's date during AEST mornings), freely editable; a six-row preview of current club totals (club name at `--font-size-sm`, total weight 600); Confirm and Cancel buttons.

4. Confirm handler: validate the date is a complete YYYY-MM-DD value — if empty/invalid, show an error Toast and keep the Sheet open with state untouched (threat T-02-01). On valid date run `A4.update(function (s) { s.snapshots = saveSnapshot(s, date); })`, close the Sheet, and Toast "Snapshot saved". Movement and Biggest Mover keep comparing live scores against `snapshots[snapshots.length - 1]` — immediately after saving, every movement line reads dash + "no change" until data changes again (the workbook's copy-to-Previous ritual; do not special-case this).

5. tests.html — add to the `// === CASES ===` region (drive everything through `A4.saveSnapshot` / `A4.movementVs` / `A4.computeScores` on cloned DEFAULT_STATE):
   (a) "saveSnapshot: first save appends" — returns a length-1 array whose entry carries the given date and scores deep-equal to `computeScores` of that state;
   (b) "saveSnapshot: pure" — the input state's `snapshots` array is unchanged (still empty) and the returned array is a different reference;
   (c) "saveSnapshot: distinct dates append in order" — a second save with a later date yields length 2 with the new date last;
   (d) "saveSnapshot: same-date replace" — re-saving an existing date after changing club data keeps the length and stores the recomputed scores (no duplicate dates);
   (e) "saveSnapshot: prunes to 60" — seed `state.snapshots` with 60 generated entries, save a new distinct date, assert length is 60, the oldest date is gone, and the new date is present;
   (f) "movement vs saved snapshot" — save a snapshot of seed state via `saveSnapshot`, then set marsden-park to all 10 DCP goals: `movementVs(snapshots[last], computeScores(changed))` gives marsden-park scoreDelta +50 and rankDelta +2, and quakers-hill rankDelta −1.
   The existing Phase 1 `movementVs(null)` cases already prove zero/null movement before any snapshot — leave them untouched.

Constraints: only `index.html` and `tests.html` change; no new dependencies; tokens named above are the only styling vocabulary (no raw values outside `:root`); CORE additions stay DOM-free.
  </action>
  <verify>
    <automated>node -e 'const fs=require("fs");const w={};new Function("window","\"use strict\";"+fs.readFileSync("index.html","utf8").match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/)[1])(w);let p=0,f=0;const assertEq=(n,a,e)=>{JSON.stringify(a)===JSON.stringify(e)?p++:(f++,console.error("FAIL "+n+" expected "+JSON.stringify(e)+" got "+JSON.stringify(a)))};new Function("A4","assertEq","\"use strict\";"+fs.readFileSync("tests.html","utf8").match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/)[1]+"\nrunCases(A4,assertEq);")(w.A4,assertEq);console.log(p+" passed, "+f+" failed");process.exit(f?1:0)' && grep -q 'function saveSnapshot' index.html && grep -c 'saveSnapshot' tests.html | grep -qv '^0$'</automated>
  </verify>
  <done>
- `window.A4.saveSnapshot` exists in CORE; all six new snapshot cases plus both Task 1 cases and all 32 Phase 1 assertions pass (headless runner exits 0, zero failures).
- In the browser: snapshot button opens the Sheet with today's local date editable and a six-row totals preview; Confirm stores the snapshot, toasts, and movement reads dash + "no change"; changing club data afterwards shows correct signed deltas and rank chips; Cancel/scrim leave state untouched.
- Commit checkpoint (conventional): `feat: weekly snapshots with rank movement`
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Sheet date input → state.snapshots | User-typed/edited date string crosses into persisted state |
| localStorage → AppState | Hand-edited or corrupted stored JSON (boundary established Phase 1) |
| State text → leaderboard DOM | Club names / values interpolated into innerHTML |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | Sheet date input | mitigate | Confirm handler validates a complete YYYY-MM-DD value before calling saveSnapshot; invalid → error Toast, Sheet stays open, no state write |
| T-02-02 | Denial of Service | state.snapshots growth | mitigate | saveSnapshot prunes to 60 entries oldest-first (B5 data-safety), preventing unbounded localStorage growth |
| T-02-03 | Tampering (stored XSS) | renderLeaderboard / Sheet preview innerHTML | mitigate | All interpolated text routed through the existing esc() helper |
| T-02-04 | Tampering | Hand-edited localStorage snapshots (non-array/garbage) | mitigate | Phase 1 loadState deepMerge replaces arrays wholesale on corrupt JSON; movementVs already returns zero/null for missing clubs/snapshot |

No package-manager installs this phase (C4: no new dependencies) — supply-chain row (T-02-SC) not applicable.
</threat_model>

<verification>
Run from the project root (`/Users/rajnaidu/Projects/area4-gamification`):

1. **Headless parity suite** — the node one-liner in each task's `<verify>` (extracts the CORE region from index.html and the CASES region from tests.html) exits 0 printing `N passed, 0 failed`, where N = 32 Phase 1 assertions + the Phase 2 additions.
2. **Browser suite** — `python3 -m http.server` then open `http://localhost:8000/tests.html` (fetch of index.html is blocked from file://): summary line green, zero failures.
3. **Visual check at 360px** — open `http://localhost:8000/index.html` in devtools responsive mode at 360px width:
   - Chips row: Leading Club (Quakers Hill or Blacktown City), Biggest Mover shows "—", Area Total shows 10 (seed bonuses).
   - Six ranked cards: Quakers Hill and Blacktown City share rank 1 with gold medal badges (Excel tie semantics), remaining four at rank 3 with neutral badges; movement lines read "— no snapshot yet".
   - Tapping a card animates the six-category breakdown open (footer repeats the total, zero rows muted); tapping again collapses; Enter/Space works with keyboard focus.
   - "Save weekly snapshot" opens the Sheet: today's date (local) editable, six-row totals preview; Confirm → "Snapshot saved" Toast, movement now "— no change"; then in the console run `A4.update(s => { s.tmi["marsden-park"].goals = [1,1,1,1,1,1,1,1,1,1]; })` → Marsden Park jumps to rank 1 with "▲ +50 since last snapshot", a +2 rank chip, and Biggest Mover shows Marsden Park +50.
   - No horizontal scroll anywhere; chips wrap instead of overflowing.
4. **Token discipline** — `! sed '/:root {/,/^}/d' index.html | grep -qE '#[0-9A-Fa-f]{6}\b|[0-9]+px'` exits 0 (no raw hex/px outside the :root token block; validated clean against the Phase 1 baseline).
5. **Scope guard** — `git status` shows changes only in `index.html` and `tests.html`; the only `<script src>` in index.html remains the Phase 1 Chart.js CDN tag (no new dependencies).
</verification>

<success_criteria>
Mirrors ROADMAP Phase 2 success criteria — all must be TRUE:
1. Home screen lists all six clubs sorted by rank with gold/silver/bronze medals for the top 3; each card shows club name, total score, and movement arrow paired with delta text (never color-only).
2. Tapping a club card expands a breakdown showing points for all six categories (DCP, Distinguished, Membership, Admin, Awards, Club Health).
3. Callout chips show Leading Club, Biggest Mover ("—" when no snapshot exists), and Area Total.
4. "Save weekly snapshot" opens a confirm Sheet with an editable date defaulting to today; after saving and then changing club data, every club shows the correct scoreDelta and rankDelta versus that snapshot.
5. Snapshots prune to 60 entries (oldest removed); movement is zero/null before any snapshot exists; same-date saves replace rather than duplicate.
Plus: all Phase 1 assertions still pass (no regressions), and the two conventional commits exist (`feat: leaderboard with club cards, breakdowns, callouts`, `feat: weekly snapshots with rank movement`).
</success_criteria>

<output>
Create `.planning/phases/02-leaderboard/02-01-SUMMARY.md` when done (per `$HOME/.claude/gsd-core/templates/summary.md`).
</output>
