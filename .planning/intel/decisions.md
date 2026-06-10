# Decisions (Locked)

All decisions below are LOCKED. Both source artifacts are locked Superpowers documents
(design spec precedence 0; implementation plan precedence 1, derived from the spec).
None of these may be revisited downstream without unlocking the source docs.

---

## DEC-single-file-vanilla-js — Single-file HTML, vanilla JS, no framework/build step
- status: locked
- source: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/specs/2026-06-11-area4-gamification-design.md (Decisions table, B1)
- decision: The entire application is one `index.html` file: vanilla ES2020 JavaScript + CSS custom properties. No framework, no build step, no backend, no accounts. Runtime is any static file host (GitHub Pages recommended); must also work from `file://`.
- rationale: "Single-file HTML" is a hard requirement from the Area Director; frameworks add a build step.
- scope: architecture / tech stack

## DEC-chartjs-cdn — Chart.js 4.x UMD via jsdelivr CDN, with offline fallback
- status: locked
- source: design spec (Decisions table, B1, B4); implementation plan (Tech Stack, Task 4.1)
- decision: Only external dependency is Chart.js 4.x UMD loaded with `defer` from jsdelivr (`https://cdn.jsdelivr.net/npm/chart.js@4`). Feature-detect `window.Chart`; when the CDN is unreachable the app must remain fully functional, degrading the chart to an HTML score-history table.
- scope: charting / external dependencies

## DEC-localstorage-key — Persistence via localStorage key `idiff-area4-v1`
- status: locked
- source: design spec (B2, B4); implementation plan (Task 1.2)
- decision: One root `AppState` object persisted under localStorage key `idiff-area4-v1`, with `version: 1` schema field for future migration. `loadState()` deep-merges saved state over defaults; `saveState()` try/catches quota errors with a Toast warning (app keeps working in memory).
- scope: persistence / data model

## DEC-a4-kit — Custom component library "A4 Kit"
- status: locked
- source: design spec (A4); implementation plan (Architecture, Tasks 2.1, 3.1)
- decision: A fixed custom library of CSS class blocks + JS render functions inside the single file — no external UI dependency. Components: AppShell, ClubCard, ScoreBreakdown, CalloutChip, TrendChart, FormRow, NumberStepper, ToggleChip, ClubPicker, Sheet, Toast, FileDrop, SettingsList.
- scope: UI components

## DEC-design-tokens — Design token system (color, typography, spacing)
- status: locked
- source: design spec (A1–A3); implementation plan (Task 1.1: "no raw hex/px values outside the `:root` block")
- decision:
  - Color tokens (Toastmasters brand palette + functional): `--color-primary #004165` (Loyal Blue), `--color-accent #772432` (True Maroon), `--color-gray #A9B2B1`, `--color-yellow #F2DF74`, `--color-bg #F4F6F8`, `--color-surface #FFFFFF`, `--color-text #1A2B33`, `--color-text-muted #5B6B73`, `--color-success #1E7B4F`, `--color-error #B3261E`, `--color-gold #D4A017`, `--color-silver #8E979E`, `--color-bronze #B08D57`.
  - Typography: system font stack only (no webfonts); `--font-size-xs 12px / sm 14px / base 16px / lg 18px / xl 22px / 2xl 28px`; weights 400/600/700.
  - Spacing: 4px base — `--space-1: 4px` through `--space-6: 32px` (4/8/12/16/24/32); radii `--radius-sm 8px / md 12px / lg 16px`; touch targets ≥ 44px.
  - Token discipline: all UI styling must reference tokens; no raw values outside `:root`.
- scope: UI design system

## DEC-scoring-formulas — Scoring engine replicates Excel workbook formulas exactly
- status: locked
- source: design spec (B2 scoring engine; source of truth `Area4_Gamification_Tracker.xlsx`, extracted 2026-06-11); implementation plan (Task 1.3)
- decision: One pure function `computeScores(state) -> {[clubId]: {total, rank, breakdown}}`:
  - `dcp = goalsMet × w.dcpGoal`
  - `dist = P→w.distP | S→w.distS | D→w.distD | else 0`
  - `membership = (current − base) × w.memberGrowth + (current ≥ 20 ? w.memberBonus20 : 0)`
  - `admin = (duesOct + duesApr) × w.duesOnTime + officerList × w.officerList + cotRounds × w.cotRound`
  - `awards = (smedley + talkUp + beatTheClock) × w.d90Award + tripleCrowns × w.tripleCrown + areaWins × w.contestArea + divWins × w.contestDivision + distWins × w.contestDistrict`
  - `health = (attendancePct ≥ 75 ? w.attendance75 : attendancePct ≥ 50 ? w.attendance50 : 0) + min(guests × w.perGuest, w.guestCap) + conversions × w.perConversion + min(meetings × w.perMeeting, w.meetingCap)`
  - `total` = sum of the six categories; rank by total descending with Excel RANK tie semantics (tied totals share the higher rank; next rank skips).
  - Movement = `movementVs(latestSnapshot, scores)` → per-club `{scoreDelta, rankDelta}`, mirroring the workbook's Previous Score / Previous Rank columns.
  - 21 weight keys (19 workbook weights + 2 caps the workbook hardcodes): `dcpGoal:5, distD:10, distS:15, distP:25, memberGrowth:2, memberBonus20:5, duesOnTime:5, officerList:5, cotRound:5, d90Award:5, tripleCrown:5, contestArea:3, contestDivision:5, contestDistrict:10, attendance75:5, attendance50:3, perGuest:1, guestCap:10, perConversion:5, perMeeting:1, meetingCap:5`.
  - Attendance entered as whole percent 0–100 in UI (workbook stores fractions; conversion documented in the engine).
- scope: scoring engine / business logic

## DEC-club-roster — Club ids and club numbers (six Area 4 clubs)
- status: locked
- source: design spec (B2, Seed data); implementation plan (Task 1.2)
- decision: Club ids: `marsden-park`, `quakers-hill`, `prospect-phoenix`, `blacktown-city`, `rooty-hill`, `holroyd`. Club numbers: Marsden Park 28679342, Quakers Hill 9448, Prospect Phoenix `null` (TBC — not in the public TMI Find-a-Club directory as of 2026-06-11; editable in Settings), Blacktown City 3378, Rooty Hill 9627, Holroyd 7851. Membership base/current seed: 18/18, 22/22, 15/15, 20/20, 14/14, 16/16 (2026-07-01 baseline).
- note: spec displays some numbers zero-padded (e.g. 00009448); plan stores bare integers — numerically identical (see INGEST-CONFLICTS.md INFO).
- scope: configuration / seed data

## DEC-build-order — 4-phase build order
- status: locked
- source: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/plans/2026-06-11-area4-gamification-plan.md
- decision:
  1. **Phase 1 — Core:** index.html skeleton + design tokens (1.1), state module + seed data + localStorage (1.2), scoring engine + parity tests in tests.html (1.3)
  2. **Phase 2 — Leaderboard:** leaderboard screen with ClubCards/breakdowns/callouts (2.1), snapshot system + movement (2.2)
  3. **Phase 3 — Data ingestion:** TMI manual fields screen (3.1), TMI CSV fetch + upload fallback + sample CSV (3.2), manual entry awards/health + minutes extractor (3.3)
  4. **Phase 4 — Trends/settings/polish:** trends chart + snapshot history (4.1), settings + weight editor + export/import (4.2), mobile polish + README (4.3)
- scope: implementation sequencing

## DEC-minutes-ingestion — Structured manual entry + regex paste-parse helper (no NLP)
- status: locked
- source: design spec (Decisions table); implementation plan (Task 3.3)
- decision: Minutes ingestion is structured manual-entry forms per club plus a paste-text quick-parse helper (regexes for attendance %, "N of M members", guests, conversions, meetings) that pre-fills the form for user review. Full NLP is out of scope for a client-only app.
- scope: data ingestion

## DEC-snapshot-cadence — Manual weekly snapshot button, no auto-save
- status: locked
- source: design spec (Decisions table, A5 screen 1); implementation plan (Task 2.2)
- decision: Snapshots are saved only via an explicit "Save weekly snapshot" button (Sheet confirm with editable date). Matches the workbook's deliberate weekly ritual; avoids accidental mid-edit snapshots. Movement always compares live scores vs the latest stored snapshot taken before the new save.
- scope: snapshot behavior
