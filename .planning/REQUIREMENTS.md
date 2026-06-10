# Requirements: i-Differentiate Area 4

**Defined:** 2026-06-11 (extracted from locked Superpowers spec + plan; see `.planning/intel/requirements.md`)
**Core Value:** Area Director can complete the full weekly update ritual (TMI CSV in → minutes data in → snapshot saved → WhatsApp-shareable leaderboard) on a phone, with scores matching the Excel workbook exactly for identical inputs.

Sources (authoritative, LOCKED):
- SPEC: `docs/superpowers/specs/2026-06-11-area4-gamification-design.md`
- PLAN: `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md`

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase.

### Core: Shell, State, Scoring

- [ ] **REQ-app-shell**: App shell with sticky brand header ("i-Differentiate Area 4", "Area 4 · District 90" subtitle) and bottom tab bar with 5 hash-routed screens (`#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`); single `render()` dispatcher keyed on `location.hash`, re-rendered on state change; all styling via tokens only. *(SPEC A4/A5; PLAN Task 1.1)*
- [ ] **REQ-seed-data**: DEFAULT_STATE seeds 6 clubs per DEC-club-roster with 2026-07-01 membership baseline (18/18, 22/22, 15/15, 20/20, 14/14, 16/16); all DCP goals/awards/health 0; distinguished blank; `snapshots: []`; 21 weights at workbook defaults; `version: 1`; `programYear: "2025-2026"`, district 90, area 4. Parity: seed totals 0 except ≥20-member bonus (Quakers Hill +5, Blacktown City +5). *(SPEC Seed data/B2; PLAN Task 1.2)*
- [ ] **REQ-scoring-engine**: Pure `computeScores(state)` and `movementVs(snapshot, scores)` per DEC-scoring-formulas, extractable for testing; companion `tests.html` (not shipped/linked) asserts workbook parity: full-house club total 176 (dcp 50, dist 25, membership 13, admin 25, awards 33, health 30); boundaries (attendance 75→5, 74→3, 50→3, 49→0; members 20→bonus, 19→none; 12 guests→capped 10; 7 meetings→capped 5); negative growth (−3 → −6); Excel RANK tie semantics. *(SPEC B2/Testing; PLAN Task 1.3)*

### Leaderboard & Snapshots

- [ ] **REQ-leaderboard**: Home screen with ranked ClubCards (rank medal gold/silver/bronze for top 3, club name, score, movement arrow + delta text); tap-to-expand ScoreBreakdown with six category rows; CalloutChips: Leading Club, Biggest Mover (Happy Yellow; "—" when no snapshot), Area Total. Movement never color-only. *(SPEC A5 screen 1/A4; PLAN Task 2.1)*
- [ ] **REQ-snapshots**: "Save weekly snapshot" button → Sheet confirm with editable `YYYY-MM-DD` date (defaults today) and current totals → push `{date, scores}` onto `state.snapshots`, prune to max 60 (oldest first), save, Toast "Snapshot saved"; movement (scoreDelta/rankDelta per club) computed against latest stored snapshot; zero/null when no snapshot exists. *(SPEC B2/A5/B5; PLAN Task 2.2)*

### Data Ingestion

- [ ] **REQ-tmi-data-screen**: TMI Data screen: last-sync stamp, ClubPicker, per-club editable TMI fields — membership base + current (clamp 0–500), 10 DCP goal ToggleChips (G1–G10 workbook labels), distinguished select (None/D/S/P), ToggleChips for dues Oct/Apr + officer list, NumberStepper 0–2 for COT rounds; every field writes state + `saveState()` on change. *(SPEC A5 screen 2; PLAN Task 3.1)*
- [ ] **REQ-tmi-csv-ingestion**: "Refresh from TMI" fetches the TMI dashboards CSV client-side; on any failure (CORS expected) → Toast + automatic FileDrop fallback with step-by-step instructions, never a dead end. RFC-4180-ish `parseCsv`; `mapTmiCsv` matches by club number first, normalized name second; fuzzy header mapping; workbook DCP goal thresholds; per-row try/catch never throws; results Sheet (clubs updated / unmatched / unmapped headers) before commit. Sample CSV at `sample-data/tmi-club-performance-sample.csv` (6 clubs + 2 decoys, quoted-comma names). *(SPEC B4/Error handling; PLAN Task 3.2)*
- [ ] **REQ-manual-entry**: Manual Entry screen with ClubPicker and per-club sections: Awards (NumberSteppers for Smedley, Talk Up, Beat the Clock, Triple Crowns, Area/Division/District contest wins) and Club Health (meetings stepper, avg attendance % numeric 0–100, guests stepper, conversions stepper); all values persist; attendance clamps 0–100. *(SPEC A5 screen 3; PLAN Task 3.3)*
- [ ] **REQ-minutes-extractor**: Paste-minutes quick-parse helper: textarea + "Extract" running regexes (attendance `%` or "N of M members" → percent; guests; conversions/joined; meetings) that pre-fills the Club Health form for review (no auto-save); "nothing found" Toast when no pattern matches; 4 positive + 1 negative regex cases pass in tests.html. *(SPEC Decisions/A5; PLAN Task 3.3)*

### Trends, Settings, Backup, Docs

- [ ] **REQ-trends-chart**: Trends screen: Chart.js line chart of snapshot totals per club (x = snapshot date, fixed 6-color series led by `--color-primary`/`--color-accent` via getComputedStyle); feature-detect `window.Chart` → HTML table fallback when absent; snapshot history list below with per-row delete + Sheet confirm. *(SPEC A5 screen 4/B4; PLAN Task 4.1)*
- [ ] **REQ-settings-weights**: Settings screen with SettingsList groups: all 21 scoring weights/caps editable (clamped 0–100 integers, grouped DCP/Membership/Admin/Awards/Health with workbook labels), club config (names + numbers editable, incl. Prospect Phoenix), program year select (2025-2026 … 2027-2028), Danger zone "Reset to seed data" with Sheet confirm; weight edits immediately affect scores. *(SPEC A5 screen 5/B2; PLAN Task 4.2)*
- [ ] **REQ-export-import**: Export = Blob download `idiff-area4-backup-YYYY-MM-DD.json` of full AppState. Import = FileDrop → validate (`version === 1`, `config.clubs` array, weights object) → preview Sheet (club count, snapshot count, last sync) → replace state only on confirm; invalid file → error Toast with explicit errors, current state untouched; validator accepts exported state, rejects `{}` and version 99. *(SPEC B4/B5; PLAN Task 4.2)*
- [ ] **REQ-readme**: README.md covering what the app is, weekly workflow (refresh TMI → update minutes data → save snapshot → share), GitHub Pages hosting, backup/restore, editing weights, club number config. *(SPEC B3; PLAN Task 4.3)*

## v2 Requirements

None — v1 scope is fully defined by the locked spec and plan. New scope requires unlocking the source docs.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Backend / accounts / auth / analytics | Hard requirement: static single-file client-only app (DEC-single-file-vanilla-js) |
| Frameworks / build step | Locked: vanilla ES2020, no toolchain (DEC-single-file-vanilla-js) |
| NLP minutes parsing | Regex paste-parse helper only; full NLP infeasible client-side (DEC-minutes-ingestion) |
| Auto-saved snapshots | Manual button is deliberate, matches workbook weekly ritual (DEC-snapshot-cadence) |
| Webfonts | System font stack only; offline tolerance + first-paint budget (CON-offline-tolerant) |
| Test framework in deliverable | Companion `tests.html` with plain assertions instead (CON-test-strategy) |
| Non-Area-4 clubs | Fixed six-club roster; CSV ingestion ignores other rows (DEC-club-roster) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-app-shell | Phase 1 | Pending |
| REQ-seed-data | Phase 1 | Pending |
| REQ-scoring-engine | Phase 1 | Pending |
| REQ-leaderboard | Phase 2 | Pending |
| REQ-snapshots | Phase 2 | Pending |
| REQ-tmi-data-screen | Phase 3 | Pending |
| REQ-tmi-csv-ingestion | Phase 3 | Pending |
| REQ-manual-entry | Phase 3 | Pending |
| REQ-minutes-extractor | Phase 3 | Pending |
| REQ-trends-chart | Phase 4 | Pending |
| REQ-settings-weights | Phase 4 | Pending |
| REQ-export-import | Phase 4 | Pending |
| REQ-readme | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-11*
*Last updated: 2026-06-11 after roadmap creation*
