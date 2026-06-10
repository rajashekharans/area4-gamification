# i-Differentiate Area 4

## What This Is

A single-file HTML web app (`index.html`) that replaces the `Area4_Gamification_Tracker.xlsx` workbook as the club-performance leaderboard for Toastmasters Area 4, District 90 (NSW, Australia). The Area Director updates it weekly from the TMI dashboards CSV and club meeting minutes; the six clubs' members view it read-only via WhatsApp-shared links on their phones.

## Core Value

The Area Director can complete the full weekly update ritual (TMI CSV in → minutes data in → snapshot saved → WhatsApp-shareable leaderboard) on a phone, with scores matching the Excel workbook exactly for identical inputs.

## Requirements

### Validated

(None yet — ship to validate)

### Active

See `.planning/REQUIREMENTS.md` for the full checkable list (13 v1 requirements). Summary:

- [ ] App shell with 5 hash-routed screens (REQ-app-shell)
- [ ] Seed data: six Area 4 clubs at the 2026-07-01 workbook baseline (REQ-seed-data)
- [ ] Workbook-parity scoring engine + tests.html (REQ-scoring-engine)
- [ ] Ranked leaderboard with breakdowns, callouts, movement (REQ-leaderboard)
- [ ] Manual weekly snapshots with movement deltas, capped at 60 (REQ-snapshots)
- [ ] TMI Data screen with per-club editable fields (REQ-tmi-data-screen)
- [ ] TMI CSV fetch + FileDrop fallback + fuzzy mapping (REQ-tmi-csv-ingestion)
- [ ] Manual entry for awards and club health (REQ-manual-entry)
- [ ] Regex minutes paste-parse helper (REQ-minutes-extractor)
- [ ] Trends chart with table fallback + snapshot history (REQ-trends-chart)
- [ ] Settings: 21 editable weights, club config, program year, reset (REQ-settings-weights)
- [ ] JSON export/import with preview-confirm (REQ-export-import)
- [ ] README covering the weekly ritual end-to-end (REQ-readme)

### Out of Scope

- Backend, accounts, auth, analytics — hard requirement: static single-file app, client-side only
- Frameworks / build step / npm toolchain — single-file vanilla ES2020 is locked (DEC-single-file-vanilla-js)
- NLP minutes parsing — regex paste-parse helper only; full NLP infeasible client-side (DEC-minutes-ingestion)
- Auto-saved snapshots — manual "Save weekly snapshot" button is deliberate, matching the workbook ritual (DEC-snapshot-cadence)
- Webfonts — system font stack only; offline tolerance and first-paint budget (CON-offline-tolerant)
- Test framework dependency in the deliverable — companion `tests.html` with plain assertions instead (CON-test-strategy)
- Clubs outside Area 4 — fixed six-club roster; CSV ingestion ignores non-Area-4 rows

## Context

- **Users:** One administrator (the Area Director, on a phone) and read-only member viewers, mostly inside the WhatsApp in-app browser at ~360px width.
- **Source of truth:** `Area4_Gamification_Tracker.xlsx` (extracted 2026-06-11) defines all scoring formulas, the 21 weights/caps, seed membership numbers, and Previous Score / Previous Rank movement semantics. Workbook parity is the explicit correctness bar, asserted in `tests.html`.
- **Weekly ritual:** refresh/import TMI CSV → enter awards and club-health data from minutes → press "Save weekly snapshot" → share via WhatsApp.
- **Authoritative specs (LOCKED):**
  - `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (design spec, precedence 0)
  - `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` (implementation plan, precedence 1, derived from the spec)
- **Open data item:** Prospect Phoenix's club number is unknown (stored `null`, editable in Settings); TMI CSV matching for that club relies on the normalized-name fallback until filled in.
- **Sample data:** `sample-data/tmi-club-performance-sample.csv` (all 6 clubs + 2 non-Area-4 decoys with quoted-comma names) for ingestion testing.
- **Dev environment:** developed/verified on macOS with browser preview; must also work from `file://`.

## Constraints

- **Architecture**: No backend, no build step, no accounts; one `index.html`, vanilla ES2020 + CSS custom properties; works from any static host and `file://` — Area Director's hard requirement (CON-no-backend-no-build)
- **Performance**: `index.html` ≤ 150KB excluding Chart.js; first paint < 1s on a mid-range phone (CON-single-file-size)
- **Usability**: Mobile-first at 360px, one-handed, WhatsApp in-app browser; no horizontal scroll; `min-height: 100dvh` with fallback, no `100vh` traps (CON-mobile-first-360)
- **Accessibility**: WCAG AA contrast on all token pairs; semantic HTML; touch targets ≥ 44px; movement arrows paired with text, never color-only (CON-wcag-aa)
- **Resilience**: Everything except TMI fetch and the chart works offline; Chart.js feature-detected with HTML-table fallback; TMI fetch failure → Toast + FileDrop fallback, never a dead end (CON-offline-tolerant)
- **Schema**: localStorage key `idiff-area4-v1`, `version: 1`, deep-merge load, quota-safe save; snapshots capped at 60; input clamps (weights 0–100 int, attendance 0–100, membership 0–500, COT 0–2) (CON-localstorage-schema, CON-snapshots-cap-60, CON-input-clamps)
- **API contract**: TMI CSV URL `GET https://dashboards.toastmasters.org/<programYear>/export.aspx?type=CSV&report=clubperformance~90~~~<programYear>`; CORS expected to block → FileDrop fallback mandatory; club number match first, normalized name second; fuzzy header mapping; unmatched clubs/columns reported, never silently dropped (CON-tmi-csv-contract)
- **Maintainability**: All styling via design tokens — no raw hex/px outside `:root` (CON-token-discipline)
- **Testing**: Pure, extractable scoring/CSV functions; companion `tests.html` (not shipped/linked) asserts workbook parity; manual verification at 360px (CON-test-strategy)

## Key Decisions

All decisions below are **LOCKED**. They originate from the locked Superpowers documents — `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (authoritative, precedence 0) and `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` (precedence 1) — and may not be revisited downstream without unlocking those source docs. Full detail: `.planning/intel/decisions.md`.

<decisions status="locked" source="docs/superpowers/specs/2026-06-11-area4-gamification-design.md, docs/superpowers/plans/2026-06-11-area4-gamification-plan.md">

| ID | Decision | Rationale | Outcome |
|----|----------|-----------|---------|
| DEC-single-file-vanilla-js | One `index.html`: vanilla ES2020 + CSS custom properties; no framework/build/backend/accounts; works from static host and `file://` | Single-file HTML is a hard user requirement; frameworks add a build step | 🔒 Locked |
| DEC-chartjs-cdn | Only external dep: Chart.js 4.x UMD via jsdelivr CDN with `defer`; feature-detect `window.Chart`; degrade chart to HTML table offline | App must stay fully functional without the CDN | 🔒 Locked |
| DEC-localstorage-key | One root AppState under localStorage key `idiff-area4-v1` with `version: 1`; deep-merge load; quota-safe save with Toast warning | Simple, migratable client-side persistence | 🔒 Locked |
| DEC-a4-kit | Custom "A4 Kit" component library (13 components: AppShell, ClubCard, ScoreBreakdown, CalloutChip, TrendChart, FormRow, NumberStepper, ToggleChip, ClubPicker, Sheet, Toast, FileDrop, SettingsList) inside the single file | No external UI dependency allowed | 🔒 Locked |
| DEC-design-tokens | Full token system: TM brand colors (Loyal Blue `#004165`, True Maroon `#772432`, etc.), system fonts, 4px spacing scale, radii, ≥44px touch targets; no raw values outside `:root` | Consistency, WCAG AA, maintainability | 🔒 Locked |
| DEC-scoring-formulas | `computeScores(state)` replicates the Excel workbook exactly: six categories (dcp, dist, membership, admin, awards, health), 21 weight/cap keys at workbook defaults, Excel RANK tie semantics, `movementVs` mirroring Previous Score/Rank columns; attendance entered as whole percent 0–100 | Workbook parity is the correctness bar | 🔒 Locked |
| DEC-club-roster | Six club ids: `marsden-park` (28679342), `quakers-hill` (9448), `prospect-phoenix` (null/TBC), `blacktown-city` (3378), `rooty-hill` (9627), `holroyd` (7851); membership base/current seed 18/18, 22/22, 15/15, 20/20, 14/14, 16/16 (2026-07-01 baseline) | Matches workbook + public TMI directory as of 2026-06-11 | 🔒 Locked |
| DEC-build-order | 4-phase build: 1 Core (skeleton/tokens, state/seed/localStorage, scoring engine + tests) → 2 Leaderboard (cards/breakdowns/callouts, snapshots/movement) → 3 Ingestion (TMI fields screen, CSV fetch+fallback, manual entry + minutes extractor) → 4 Trends/settings/polish (chart+history, settings/weights/export-import, mobile polish + README) | Dependency-ordered, each phase verifiable | 🔒 Locked |
| DEC-minutes-ingestion | Structured manual-entry forms + regex paste-parse helper (attendance %, "N of M members", guests, conversions, meetings) that pre-fills for review; no NLP | Full NLP out of scope for a client-only app | 🔒 Locked |
| DEC-snapshot-cadence | Snapshots saved only via explicit "Save weekly snapshot" button (Sheet confirm, editable date); movement compares live scores vs latest stored snapshot | Matches the workbook's deliberate weekly ritual; avoids accidental mid-edit snapshots | 🔒 Locked |

</decisions>

---
*Last updated: 2026-06-11 after project initialization from ingested locked specs*
