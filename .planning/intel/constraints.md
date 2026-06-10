# Constraints

Sources:
- SPEC: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/specs/2026-06-11-area4-gamification-design.md (primarily B1, B4, B5, Error handling, Testing approach)
- PLAN: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/plans/2026-06-11-area4-gamification-plan.md

---

## CON-single-file-size — index.html ≤ 150KB excluding Chart.js
- type: nfr (performance)
- source: SPEC B5
- The entire deliverable is one `index.html` ≤ 150KB excluding Chart.js; first paint < 1s on a mid-range phone.

## CON-no-backend-no-build — No backend, no build step, no accounts
- type: nfr (architecture)
- source: SPEC ("What we're building", B1); PLAN (Tech Stack)
- Everything runs client-side; vanilla ES2020 + CSS custom properties; works from any static host and from `file://`. No auth, no server, no analytics, no PII beyond club-level aggregates.

## CON-mobile-first-360 — Mobile-first at 360px width
- type: nfr (usability)
- source: SPEC B5; PLAN Task 4.3
- Designed at 360px; comfortable one-handed; viewed from the WhatsApp in-app browser. No horizontal scroll on any screen; no `100vh` traps (use `min-height: 100dvh` with fallback); breakdown accordion animates ≤ 200ms.

## CON-wcag-aa — WCAG AA accessibility
- type: nfr (accessibility)
- source: SPEC B5
- WCAG AA contrast on all token pairs; semantic HTML (nav/main/button); touch targets ≥ 44px; movement arrows paired with text, never color-only.

## CON-offline-tolerant — Offline-tolerant operation
- type: nfr (resilience)
- source: SPEC B1, B4, B5
- All features except the TMI fetch and the chart must work with no network. Chart.js loaded with `defer`; feature-detect `window.Chart`; chart degrades to an HTML table. TMI fetch failure (CORS/network expected) → Toast + FileDrop fallback, never a dead end. No webfonts.

## CON-snapshots-cap-60 — Snapshots capped at 60
- type: schema (data safety)
- source: SPEC B5; PLAN Task 2.2
- `state.snapshots` capped at 60 entries; oldest pruned. Import never overwrites without preview confirm; export filename dated (`idiff-area4-backup-YYYY-MM-DD.json`).

## CON-localstorage-schema — localStorage schema contract
- type: schema
- source: SPEC B2, B4; PLAN Task 1.2
- Key `idiff-area4-v1`; root AppState with `version: 1` for future migration; loadState deep-merges over defaults and falls back to defaults on parse error; saveState handles quota/private-mode failure with a Toast warning while the app continues in memory.

## CON-tmi-csv-contract — TMI CSV integration contract
- type: api-contract
- source: SPEC B4; PLAN Task 3.2
- URL: `GET https://dashboards.toastmasters.org/<programYear>/export.aspx?type=CSV&report=clubperformance~90~~~<programYear>`. CORS expected to block from a static page → FileDrop fallback is mandatory. Club matching: club number first, normalized name second. Column mapping: fuzzy header match (headers change between program years). Unmatched clubs/columns reported in a Sheet, never silently dropped; per-row try/catch, parser never throws.

## CON-input-clamps — Input validation clamps
- type: schema (validation)
- source: SPEC Error handling; PLAN Tasks 3.1, 4.2
- Weight inputs clamp to 0–100 integers; attendance 0–100 whole percent; memberships 0–500; COT rounds 0–2.

## CON-token-discipline — All styling via design tokens
- type: nfr (maintainability)
- source: SPEC A1–A3; PLAN Task 1.1 / self-review
- No raw hex/px values outside the `:root` token block; every component styles via `var(--…)` tokens.

## CON-test-strategy — No test framework dependency in deliverable
- type: nfr (testing)
- source: SPEC Testing approach; PLAN Tasks 1.3, 4.3
- Scoring engine and CSV parser written as pure, extractable functions. Companion `tests.html` (not shipped/linked) runs assertion checks: workbook-parity scoring, CSV header mapping, import validation. Manual verification at 360px viewport.
