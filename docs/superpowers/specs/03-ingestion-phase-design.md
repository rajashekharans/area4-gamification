# Phase 3 Design — Data ingestion: TMI + manual entry

**Parent design system:** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED)
**Plan reference:** `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` Phase 3, Tasks 3.1–3.3

## Phase-specific decisions

### TMI screen layout

Top: sync panel — "Refresh from TMI" primary button (`--color-primary`), last-sync stamp (`--font-size-xs`, `--color-text-muted`), and a collapsed FileDrop that auto-expands on fetch failure. Below: ClubPicker (horizontal scroll chips, active chip `--color-primary` bg) then the selected club's form. One club at a time on screen — phones first.

### Form controls (A4 Kit, reused in Manual screen)

- `FormRow`: grid label + control, `--space-3` vertical rhythm, labels `--font-size-sm` weight 600.
- `NumberStepper`: − / value / + buttons, each a square touch target, `--radius-sm`, `--color-bg` buttons with `--color-primary` glyphs; value editable inline (numeric keyboard via inputmode).
- `ToggleChip`: pill, off = `--color-bg` + `--color-text-muted` border, on = `--color-primary` bg white text. DCP goals render as a 2-column wrap grid of 10 ToggleChips labeled G1–G10 with short workbook labels.
- Distinguished status: 4 ToggleChips behaving as radio (None/D/S/P), maroon `--color-accent` when on, to visually distinguish from goal chips.

### CSV ingestion contract (CORE pure functions)

- `parseCsv(text)` → array of string arrays; handles quoted fields, embedded commas/quotes, CRLF/LF, skips blank lines.
- `mapTmiCsv(rows, state)` → `{updates: {[clubId]: tmiPatch}, matched: [...], unmatchedClubs: [clubName...], unmappedFields: [...]}`. Header row located by searching first 5 rows for a cell matching `club name`. Club matching: number first (string compare after stripping leading zeros), then normalized name (lowercase, alphanumerics only, trailing `toastmasters|club` words stripped). Field mapping via ordered pattern table (first match wins) — patterns documented in the plan. Goal thresholds per workbook G1–G10 definitions. Distinguished from a status column value starting with P/S/D (case-insensitive). Never throws; collects problems.
- `applyTmiUpdates(state, updates)` → new tmi slice + `lastTmiSync` ISO stamp.

Fetch URL built from `state.config.programYear`: `https://dashboards.toastmasters.org/{yy}/export.aspx?type=CSV&report=clubperformance~{district}~~~{programYear}`. On ANY fetch/parse failure: toast (`--color-error` accent) + expand FileDrop. Results Sheet (reuses Phase 2 `openSheet`) lists matched clubs with changed fields, unmatched clubs, unmapped fields; Confirm applies, Cancel discards.

### Manual screen

Same ClubPicker + FormRow/NumberStepper kit. Two card sections: Awards (7 steppers) and Club Health (meetings stepper, attendance numeric 0–100 with `%` suffix, guests stepper, conversions stepper). Below: Minutes helper card — textarea (`--font-size-sm`), "Extract from minutes" secondary button (`--color-accent` outline); extraction fills the Health inputs and flashes them (`--color-yellow` fade) without saving until the user edits/confirms via the existing auto-save-on-change inputs; a Sheet preview shows what was found before filling. Extractor regexes per plan Task 3.3 live in CORE as `extractMinutes(text)` → `{attendancePct?, guests?, conversions?, meetings?}`.

### sample-data file

`sample-data/tmi-club-performance-sample.csv` mirrors real D90 Club Performance headers; includes all 6 clubs (Prospect Phoenix row has club number 0 to exercise name-fallback matching) + 2 decoy clubs from another area, one with a quoted comma name.
