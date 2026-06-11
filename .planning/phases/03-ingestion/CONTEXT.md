# Phase 3 Context: Data ingestion: TMI + manual entry

Stub — plans not yet created. Run `/gsd-plan-phase 3`.

- Roadmap: `.planning/ROADMAP.md` → "Phase 3: Data ingestion: TMI + manual entry"
- Requirements: REQ-tmi-data-screen, REQ-tmi-csv-ingestion, REQ-manual-entry, REQ-minutes-extractor
- Authoritative plan-doc section: `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` — Phase 3 (Tasks 3.1 TMI manual fields screen, 3.2 TMI CSV fetch + upload fallback + sample CSV, 3.3 manual entry awards/health + minutes extractor)
- Design authority: `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (A5 screens 2–3, B4 TMI boundary, Error handling)
- Sample data: `sample-data/tmi-club-performance-sample.csv`

## Discussion outcome (2026-06-11)
Context resolved from LOCKED docs + phase design. Inputs:
- docs/superpowers/specs/2026-06-11-area4-gamification-design.md (LOCKED)
- docs/superpowers/specs/03-ingestion-phase-design.md (TMI screen, form kit, CSV contract parseCsv/mapTmiCsv/applyTmiUpdates/extractMinutes, sample CSV spec)
- Plan-doc Phase 3 (Tasks 3.1-3.3)
Phase 2 delivered: generic openSheet(), Toast, leaderboard + snapshots. tests.html at 41 green.
