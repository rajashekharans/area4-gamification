# Context

Background notes by topic, with source attribution.

---

## Topic: Who and where
- source: /Users/rajnaidu/Projects/area4-gamification/docs/superpowers/specs/2026-06-11-area4-gamification-design.md ("What we're building")
- Toastmasters Area 4, District 90 (NSW, Australia). Six clubs: Marsden Park, Quakers Hill, Prospect Phoenix, Blacktown City, Rooty Hill, Holroyd. The Area Director administers the tracker; club members are read-only viewers.

## Topic: What it replaces
- source: design spec (header, "What we're building", Seed data)
- Replaces the Area 4 gamification Excel workbook `Area4_Gamification_Tracker.xlsx` (extracted 2026-06-11), which is the source of truth for all scoring formulas, the 21 weights/caps, seed membership numbers (2026-07-01 baseline), and the Previous Score / Previous Rank movement semantics. Workbook parity is the explicit correctness bar (tests.html asserts it).

## Topic: Weekly update ritual
- source: design spec ("What we're building", Decisions table); plan (Task 4.3 README workflow)
- The Area Director updates weekly: refresh/import the TMI dashboards CSV → enter awards and club-health data from club meeting minutes → press "Save weekly snapshot" → share. Snapshot saving is deliberately manual (button, no auto-save) to match the workbook's weekly ritual.

## Topic: WhatsApp sharing and consumption
- source: design spec ("What we're building", B1, B5)
- The app is shared with members via WhatsApp links and viewed mostly on phones, often inside the WhatsApp in-app browser — driving the mobile-first 360px design, one-handed use, GitHub Pages hosting recommendation, and the `100dvh` quirk handling.

## Topic: Status and authorship
- source: design spec (Status line, Decisions table); plan (header); classifications
- Spec status: Approved — requirements supplied in full by the Area Director, with a documented table of decisions made autonomously where the user was not present (framework, charting, minutes ingestion approach, attendance units, Prospect Phoenix club number null, manual snapshot cadence). Both docs written 2026-06-11 by the same author; the implementation plan was derived from and is subordinate to the design spec.

## Topic: Known open data item
- source: design spec (Decisions table, Seed data)
- Prospect Phoenix Toastmasters' club number is unknown (not in the public TMI Find-a-Club directory as of 2026-06-11 — likely newly chartered/renamed). Stored as `null`; the Area Director fills it in via Settings. Until then, TMI CSV matching for that club relies on the normalized-name fallback.
