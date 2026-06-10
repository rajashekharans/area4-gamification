---
phase: 01-core
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [index.html, tests.html]
autonomous: true
requirements: [REQ-app-shell, REQ-seed-data, REQ-scoring-engine]

must_haves:
  truths:
    - "Opening index.html in a browser (including from file://) shows the branded sticky header and 5-tab bottom bar; tapping tabs switches hash-routed screens (#leaderboard, #tmi, #manual, #trends, #settings)"
    - "Edits to state survive a page reload (localStorage key idiff-area4-v1); with storage cleared, the app boots to seed data showing all six Area 4 clubs"
    - "Seed-state parity holds: every club totals 0 except the >=20-member bonus — Quakers Hill +5 and Blacktown City +5 only"
    - "All tests.html assertions pass: full-house total 176 with correct six-category breakdown, attendance/guest/meeting boundary and cap cases, negative growth, Excel RANK tie semantics"
    - "Source review finds no raw hex or pixel values outside the :root token block"
  artifacts:
    - path: "index.html"
      provides: "Entire app: :root design tokens, AppShell markup, Chart.js CDN script tag, CORE script region (DEFAULT_STATE, loadState, saveState, computeScores, movementVs) and UI script region (render dispatcher, screen renderers), window.A4 exposure"
      min_lines: 200
      contains: "// === CORE ==="
    - path: "tests.html"
      provides: "Workbook-parity assertion harness: fetches index.html, extracts CORE region, runs assertEq cases, renders pass/fail rows"
      min_lines: 60
  key_links:
    - from: "index.html nav tab bar"
      to: "render dispatcher"
      via: "location.hash + hashchange listener"
      pattern: "hashchange"
    - from: "index.html CORE region"
      to: "tests.html"
      via: "window.A4 exposure and // === CORE === / // === UI === markers"
      pattern: "window\\.A4"
    - from: "saveState"
      to: "localStorage"
      via: "key idiff-area4-v1"
      pattern: "idiff-area4-v1"
    - from: "tests.html"
      to: "index.html"
      via: "fetch + regex extraction between CORE and UI markers"
      pattern: "=== CORE ==="
---

<objective>
Build the invisible foundation of the i-Differentiate Area 4 app: a token-styled single-file shell that hash-routes between five screens, persisted seed state that survives reloads, and a pure scoring engine that matches the Area 4 Excel workbook exactly — proven green by a companion tests.html parity suite.

Purpose: Phases 2–4 (leaderboard, ingestion, trends/settings) all build on this skeleton, this state shape, and this engine. Workbook parity locked in now means every later feature inherits Excel-exact scores.

Output: `index.html` (app shell + tokens + state + scoring core) and `tests.html` (parity harness), both at repo root per design.md B3.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>

**REQUIRED design reference (read before any task — LOCKED, all values come from here):**
@docs/superpowers/specs/2026-06-11-area4-gamification-design.md

All color/typography/spacing token VALUES live in sections A1–A3 of that file; this plan refers to tokens by NAME only. The data model and scoring formulas are section B2. The seed table is the "Seed data" section.

**Phase-specific architecture (file regions, render dispatcher, window.A4, tests.html harness, RANK semantics):**
@docs/superpowers/specs/01-core-phase-design.md

**Authoritative task skeleton (Phase 1, Tasks 1.1–1.3):**
@docs/superpowers/plans/2026-06-11-area4-gamification-plan.md

**Project planning state:**
@.planning/ROADMAP.md
@.planning/phases/01-core/CONTEXT.md

</context>

<constraints>
- **Files:** Only `index.html` and `tests.html` (both at repo root, per design.md B3) may be created or modified in this phase. No other files.
- **Dependencies:** The ONLY external dependency is Chart.js 4.x UMD via jsdelivr CDN (design.md B1/B4). Its `<script defer>` tag is added in Task 1 to keep the `<head>` stable, but Chart.js is not USED until Phase 4. No npm, no other CDNs, no webfonts.
- **Token discipline:** No raw style values (no hex colors, no pixel literals, no font names) anywhere outside the `:root` token block in `index.html`. All component CSS uses `var(--token-name)` exclusively. This plan's task descriptions likewise name tokens only — values are read from design.md A1–A3.
- **Region order inside index.html** (per 01-core-phase-design.md, so later phases append predictably): (1) `<head>` with `:root` tokens first, then base/reset, then component classes in A4 Kit order; (2) `<body>` AppShell markup; (3) Chart.js CDN script tag; (4) inline IIFE script with `// === CORE ===` region (no DOM access) before `// === UI ===` region. Pure core exposed as `window.A4`.
</constraints>

<tasks>

<task type="auto">
  <name>Task 1: index.html skeleton with design tokens and routed app shell</name>
  <files>index.html</files>
  <action>
Create `index.html` implementing plan-doc Task 1.1, with values sourced exclusively from `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` A1–A3:

1. HTML5 skeleton: `<head>` with `<meta name="viewport" content="width=device-width, initial-scale=1">`, title "i-Differentiate Area 4", and a `<style>` block whose FIRST rule is a `:root` block declaring ALL design tokens exactly as named in the spec — colors `--color-primary`, `--color-accent`, `--color-gray`, `--color-yellow`, `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-success`, `--color-error`, `--color-gold`, `--color-silver`, `--color-bronze`; typography `--font-family` (the A2 system stack), `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`; spacing `--space-1` through `--space-6`; radii `--radius-sm`, `--radius-md`, `--radius-lg`. Copy each value verbatim from design.md A1–A3 — the :root block is the ONLY place raw values may appear.
2. Base styles: body uses `var(--font-family)`, `var(--color-bg)` background, `var(--color-text)` text, zero default margin.
3. AppShell markup (semantic HTML per design.md B5): sticky `<header class="app-header">` styled with `--color-primary` background and `--color-surface` text, containing the app title at `--font-size-xl` weight 700 and an "Area 4 · District 90" subtitle at `--font-size-sm` in reduced opacity; `<main id="screen">` with `--space-4` padding; fixed bottom `<nav class="tab-bar">` of 5 `<button>` tabs (Leaderboard, TMI, Manual, Trends, Settings) on a `--color-surface` background, labels at `--font-size-xs`, active tab in `--color-primary`, inactive tabs in `--color-text-muted`. Each tab sets `location.hash` to its route (`#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`).
4. Add `<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>` after the body markup, before the inline script (present from Phase 1 per 01-core-phase-design.md; used in Phase 4; the app must not depend on it loading).
5. Inline `<script>` with `"use strict";` IIFE containing the two ordered region markers: `// === CORE ===` (empty for now except a `window.A4 = {}` export stub) then `// === UI ===` with the render architecture from 01-core-phase-design.md: `render()` reads `location.hash` (default `#leaderboard`), dispatches to one `renderX(mainEl, state)` function per screen, and re-applies the active-tab class; `window.addEventListener('hashchange', render)` plus an initial call. All five screens exist as routes: each of the five renderers outputs a titled placeholder (screen title at `--font-size-xl`) — the Leaderboard placeholder is upgraded to real computed totals in Task 3. Full-screen innerHTML rebuild per render is the accepted pattern (6 clubs; no virtual DOM).

Initialize git (`git init`) if the repo has no `.git` yet, then commit.
  </action>
  <verify>
    <automated>grep -c 'hashchange' index.html returns >= 1; grep -c '=== CORE ===' index.html returns >= 1; grep -c 'cdn.jsdelivr.net/npm/chart.js@4' index.html returns 1; grep -E '#[0-9a-fA-F]{3,8}\b' index.html only matches inside the :root block (manual eyeball of grep -n output)</automated>
    <human-check>Open index.html in a browser at 360px viewport: sticky branded header, bottom tab bar, tapping each of the 5 tabs swaps the placeholder screen and moves the active-tab highlight; works from file://</human-check>
  </verify>
  <done>index.html exists with complete :root token set (names exactly per design.md A1–A3), AppShell renders, all 5 hash routes switch screens, Chart.js CDN tag present, CORE/UI region markers in place, no raw style values outside :root. Commit: `feat: app shell with design tokens and tab navigation`</done>
</task>

<task type="auto">
  <name>Task 2: State module — DEFAULT_STATE seed, loadState/saveState, localStorage persistence</name>
  <files>index.html</files>
  <action>
In the `// === CORE ===` region of `index.html`, implement plan-doc Task 1.2 exactly per design.md B2 and the seed table:

1. `DEFAULT_STATE` with `version: 1`; `config: { district: 90, area: 4, programYear: "2025-2026", clubs: [...] }` where clubs is exactly these six, in this order, with these ids/names/numbers and tmi membership seeds:

   | id | name | clubNumber | base | current |
   |---|---|---|---|---|
   | `marsden-park` | Marsden Park Toastmasters | 28679342 | 18 | 18 |
   | `quakers-hill` | Quakers Hill Toastmasters | 9448 | 22 | 22 |
   | `prospect-phoenix` | Prospect Phoenix Toastmasters | null | 15 | 15 |
   | `blacktown-city` | Blacktown City Toastmasters | 3378 | 20 | 20 |
   | `rooty-hill` | Rooty Hill Toastmasters | 9627 | 14 | 14 |
   | `holroyd` | Holroyd Toastmasters | 7851 | 16 | 16 |

2. `weights` with exactly these 21 keys and workbook defaults (19 workbook weights + 2 caps): `dcpGoal: 5, distD: 10, distS: 15, distP: 25, memberGrowth: 2, memberBonus20: 5, duesOnTime: 5, officerList: 5, cotRound: 5, d90Award: 5, tripleCrown: 5, contestArea: 3, contestDivision: 5, contestDistrict: 10, attendance75: 5, attendance50: 3, perGuest: 1, guestCap: 10, perConversion: 5, perMeeting: 1, meetingCap: 5`.
3. Per-club sub-objects keyed by clubId: `tmi` (base/current per seed table, `goals: [0,0,0,0,0,0,0,0,0,0]`, `distinguished: ""`, `duesOct: 0`, `duesApr: 0`, `officerList: 0`, `cotRounds: 0`), `awards` (smedley, talkUp, beatTheClock, tripleCrowns, areaWins, divWins, distWins — all 0), `health` (meetings, attendancePct, guests, conversions — all 0). Plus `snapshots: []` and `lastTmiSync: null`.
4. `loadState()`: read localStorage key `idiff-area4-v1`, JSON.parse inside try/catch, deep-merge the parsed object OVER a fresh structuredClone of DEFAULT_STATE (so future fields never break old saves), return defaults clone on missing key or parse error.
5. `saveState(state)`: JSON.stringify to the same key inside try/catch; on failure (quota / private mode per design.md error handling) show a minimal Toast — a transient message element styled with `--color-surface` background, `--color-text` text, `--space-3` padding, `--radius-md` corners, `--font-size-sm` — warning that changes will not persist; app keeps working in memory. The Toast helper lives in the UI region; saveState calls it via a guarded reference so CORE stays evaluable without a DOM (tests.html requirement).
6. UI region: add `update(fn)` (mutate → saveState → render) as the single mutation path per 01-core-phase-design.md, and boot via `let state = loadState()`.
7. Expose on `window.A4`: `DEFAULT_STATE`, `loadState`, `saveState` (computeScores/movementVs join in Task 3).
  </action>
  <verify>
    <automated>node -e "const html=require('fs').readFileSync('index.html','utf8'); const core=html.split('// === CORE ===')[1].split('// === UI ===')[0]; const window={}; eval('(function(){'+core+'}())'); const s=window.A4.DEFAULT_STATE; const w=s.weights; console.assert(Object.keys(w).length===21,'21 weights'); console.assert(s.config.clubs.length===6,'6 clubs'); console.assert(s.config.clubs[1].id==='quakers-hill'&&s.tmi['quakers-hill'].current===22,'seed'); console.log('STATE OK')" prints STATE OK</automated>
    <human-check>In the browser: change any state value via console A4 hooks or wait for Task 3 totals, reload — state persists; run localStorage.removeItem('idiff-area4-v1') + reload — app boots to seed with six clubs</human-check>
  </verify>
  <done>DEFAULT_STATE matches design.md B2 + seed table exactly (6 club ids/names/numbers, 21 weight keys/defaults, zeroed tmi/awards/health, empty snapshots); state survives reload under key `idiff-area4-v1`; cleared storage boots to seed; CORE region evaluates with no DOM access. Commit: `feat: app state with workbook seed data and localStorage persistence`</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Scoring engine (pure) + tests.html workbook-parity suite</name>
  <files>index.html, tests.html</files>
  <behavior>
Required assertion cases (from plan-doc Task 1.3 — write these in tests.html FIRST, watch them fail, then implement):
- **Seed parity:** computeScores(DEFAULT_STATE) → every club total 0 EXCEPT the >=20-member bonus: Quakers Hill (current 22) +5 and Blacktown City (current 20) +5; all other clubs exactly 0.
- **Full-house club:** 10 goals met, distinguished "P", growth +4 to current 24, all admin flags (duesOct, duesApr, officerList, cotRounds 2), 1 Smedley, 2 Triple Crowns, 1 win at each contest level, 80% attendance, 12 guests, 2 conversions, 7 meetings → breakdown dcp 50, dist 25, membership 13 (8 growth + 5 bonus), admin 25, awards 33 (5+10+3+5+10), health 30 (5+10+10+5) → **total 176**.
- **Attendance boundaries:** 75 → 5; 74 → 3; 50 → 3; 49 → 0.
- **Membership bonus boundary:** current 20 → bonus applied; 19 → none.
- **Guest cap:** 12 guests → capped at 10 points.
- **Meeting cap:** 7 meetings → capped at 5 points.
- **Negative growth:** current − base = −3 → membership growth contribution −6.
- **Tie ranking (Excel RANK semantics):** two clubs with equal totals share the same rank; the next club skips a rank (two at rank 1 → next is rank 3). rank = 1 + count of other totals strictly greater.
- **movementVs:** returns zero/null deltas per club when no snapshot exists; correct scoreDelta/rankDelta against a constructed snapshot.
  </behavior>
  <action>
Implement plan-doc Task 1.3 in TDD order — tests.html cases first (RED), then the engine (GREEN):

1. **tests.html** (repo root; companion file, never linked from index.html): per 01-core-phase-design.md, `fetch('index.html')`, extract the inline script between the `// === CORE ===` and `// === UI ===` markers via regex, eval the core inside an isolated function scope passing a stub `window`, then run the assertion cases above using a small `assertEq(name, actual, expected)` helper (~20 lines) that appends a pass/fail row per assertion into the page body — passes in `--color-success`, failures in `--color-error`, monospace via a local style block reusing the design token names. Each non-seed case builds its state by structured-cloning `DEFAULT_STATE` and mutating one club. End with a summary line ("N passed, M failed").
2. **computeScores(state)** in the CORE region — pure, no DOM: returns `{ [clubId]: { breakdown: {dcp, dist, membership, admin, awards, health}, total, rank } }` using exactly the six design.md B2 formulas with `w = state.weights`:
   - `dcp = goalsMet × w.dcpGoal` (goalsMet = sum of the 10 goal flags)
   - `dist = "P" → w.distP | "S" → w.distS | "D" → w.distD | else 0`
   - `membership = (current − base) × w.memberGrowth + (current >= 20 ? w.memberBonus20 : 0)`
   - `admin = (duesOct + duesApr) × w.duesOnTime + officerList × w.officerList + cotRounds × w.cotRound`
   - `awards = (smedley + talkUp + beatTheClock) × w.d90Award + tripleCrowns × w.tripleCrown + areaWins × w.contestArea + divWins × w.contestDivision + distWins × w.contestDistrict`
   - `health = (attendancePct >= 75 ? w.attendance75 : attendancePct >= 50 ? w.attendance50 : 0) + min(guests × w.perGuest, w.guestCap) + conversions × w.perConversion + min(meetings × w.perMeeting, w.meetingCap)`
   - `total` = sum of the six; `rank = 1 + count(other club totals strictly greater than this total)` — ties share rank, next rank skips (locked Excel RANK semantics from 01-core-phase-design.md). Attendance is whole percent 0–100 (workbook fractions ×100, per the design's autonomous decisions).
3. **movementVs(snapshot, scores)** in CORE — per-club `{ scoreDelta, rankDelta }` vs `snapshot.scores`; when snapshot is null/undefined return zero/null deltas for every club.
4. Add `computeScores` and `movementVs` to the `window.A4` export.
5. **Exercise the engine visibly** (required by 01-core-phase-design.md — a "coming in Phase 2" placeholder is NOT acceptable): upgrade `renderLeaderboard` to a minimal tokenized list of all six clubs from `computeScores(state)` — each row a `--color-surface` card with `--space-3` padding and `--radius-sm` corners showing club name at `--font-size-lg` and computed total at `--font-size-xl` in `--color-primary`, sorted by rank. No medals/breakdowns/movement yet (Phase 2 scope).
6. Run the suite (RED → GREEN), confirm all assertions pass, fix any formula drift against design.md B2 before committing.
  </action>
  <verify>
    <automated>python3 -m http.server 8000 & open http://localhost:8000/tests.html — summary line reports 0 failed (fetch of index.html requires http://, not file://)</automated>
    <human-check>Leaderboard route shows six clubs with totals 5, 5, 0, 0, 0, 0 on seed data (Quakers Hill and Blacktown City at rank 1, ties sharing rank)</human-check>
  </verify>
  <done>computeScores and movementVs implemented per design.md B2 with Excel RANK tie semantics; window.A4 exposes both; tests.html runs the full required case list green (seed parity, full-house 176 with six-category breakdown, all boundaries/caps, negative growth, tie ranking, movementVs null case); leaderboard stub renders real computed totals. Commit: `feat: scoring engine with workbook-parity tests`</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| localStorage → app boot | Persisted JSON re-enters the app on every load; may be corrupted or hand-edited |
| jsdelivr CDN → page | Third-party script executes in page context |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | loadState() | mitigate | try/catch around JSON.parse; deep-merge over DEFAULT_STATE so malformed/partial saves degrade to defaults, never crash (Task 2) |
| T-01-02 | Denial of Service | saveState() | mitigate | quota/private-mode write failure caught; Toast warning; app continues in memory (Task 2, design.md error handling) |
| T-01-03 | Tampering | Chart.js CDN script | accept | Locked dependency (design.md B1/B4); loaded `defer`, feature-detected before use in Phase 4 so an unreachable/blocked CDN never breaks the app; no PII beyond club aggregates, client-only static page |
| T-01-SC | Tampering | package installs | accept | No npm/pip/cargo installs in this project — single-file vanilla JS, sole external dependency is the pinned jsdelivr Chart.js URL above |
</threat_model>

<verification>
**How to run:**
1. `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000/tests.html` (the harness fetches `index.html`, so it needs an http:// origin; most browsers block fetch from file://). Expected: every assertion row green, summary reports 0 failed — covering seed parity (Quakers Hill +5 and Blacktown City +5 only), full-house total 176, attendance boundaries 75/74/50/49, guest cap (12 → 10), meeting cap (7 → 5), negative growth (−3 → −6), and tie ranking.
2. Open `http://localhost:8000/index.html` (and separately directly from `file://` — the app itself must work there per ROADMAP success criterion 1) in a 360px-wide viewport: branded sticky header, 5-tab bottom bar, all five hash routes (`#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`) render with no horizontal scroll; leaderboard lists six clubs with seed totals.
3. Persistence: change state, reload — survives; clear the `idiff-area4-v1` key, reload — seed data returns.
4. Token discipline sweep: `grep -nE '#[0-9a-fA-F]{3,8}\b|[0-9]+px' index.html` — every hit must fall inside the `:root` block (line-number check).
</verification>

<success_criteria>
Phase 1 success criteria from .planning/ROADMAP.md, all five verifiable:
1. App shell with sticky header + 5-tab bar; hash routing switches all five screens (works from file://)
2. State survives reload under localStorage key `idiff-area4-v1`; cleared storage boots to six-club seed
3. Seed parity: all totals 0 except Quakers Hill +5 and Blacktown City +5
4. tests.html fully green: full-house 176 with correct six-category breakdown (50/25/13/25/33/30), boundary and cap cases, negative growth, Excel RANK ties
5. No raw hex/pixel values outside the `:root` token block
</success_criteria>

<output>
Create `.planning/phases/01-core/01-01-SUMMARY.md` when done.
</output>
