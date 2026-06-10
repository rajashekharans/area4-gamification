# Synthesis Summary

Generated: 2026-06-11 · Mode: new (fresh project, no existing .planning context)

## Sources

| Doc | Type | Precedence | Locked |
|---|---|---|---|
| docs/superpowers/specs/2026-06-11-area4-gamification-design.md | SPEC (design spec) | 0 | yes |
| docs/superpowers/plans/2026-06-11-area4-gamification-plan.md | SPEC (implementation plan) | 1 | yes |

Both written 2026-06-11 by the same author; plan derived from spec and subordinate to it. Cross-ref graph acyclic. Classification confidence: high for both (manifest-declared, content-confirmed).

## What this project is

A single-file HTML web app (`index.html`) — "i-Differentiate Area 4" — a club-performance leaderboard for Toastmasters Area 4, District 90 (NSW, Australia). It replaces `Area4_Gamification_Tracker.xlsx`. The Area Director updates it weekly from the TMI dashboards CSV and club minutes; members view it read-only via WhatsApp-shared links on phones.

## Decisions locked: 10

See `.planning/intel/decisions.md`. Headlines: single-file vanilla ES2020 JS (no framework/build/backend); Chart.js 4.x via jsdelivr CDN with table fallback; localStorage key `idiff-area4-v1`; custom "A4 Kit" component library (13 components); full design token system (TM brand colors, system fonts, 4px spacing scale); scoring formulas replicated exactly from the Excel workbook (6 categories, 21 weights/caps, Excel RANK tie semantics); six club ids/numbers with Prospect Phoenix number null/TBC; regex-based minutes extractor (no NLP); manual weekly snapshot cadence; 4-phase build order (core → leaderboard/snapshots → ingestion → trends/settings/polish).

## Requirements extracted: 13

See `.planning/intel/requirements.md`. IDs: REQ-app-shell, REQ-leaderboard, REQ-snapshots, REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor, REQ-trends-chart, REQ-settings-weights, REQ-export-import, REQ-seed-data, REQ-scoring-engine, REQ-readme. No competing acceptance variants.

## Constraints extracted: 11

See `.planning/intel/constraints.md`. Type breakdown: 7 NFR (≤150KB single file excl. Chart.js, first paint <1s, no backend/build, mobile-first 360px, WCAG AA, offline-tolerant, token discipline, no-test-framework strategy), 3 schema (snapshots capped 60, localStorage schema v1, input clamps), 1 api-contract (TMI CSV URL + CORS fallback + fuzzy matching rules).

## Context topics: 6

See `.planning/intel/context.md`: who/where (Area 4 District 90 NSW, six clubs), what it replaces (the Excel workbook, parity bar), weekly update ritual, WhatsApp sharing/consumption, status/authorship, open data item (Prospect Phoenix club number TBC).

## Conflicts

0 blockers, 0 competing variants, 2 auto-resolved (INFO): club-number zero-padding formatting (SPEC > PLAN, numerically identical) and the verified-consistent dual-LOCKED pairing with precedence recorded. Detail: `.planning/INGEST-CONFLICTS.md`.

## Intel files

- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
- `.planning/INGEST-CONFLICTS.md`

Status: READY — safe to route to gsd-roadmapper.
