# Phase 2 Design — Leaderboard, snapshots, movement

**Parent design system:** `docs/superpowers/specs/2026-06-11-area4-gamification-design.md` (LOCKED)
**Plan reference:** `docs/superpowers/plans/2026-06-11-area4-gamification-plan.md` Phase 2, Tasks 2.1–2.2

## Phase-specific decisions

### ClubCard anatomy (A4 Kit)

`<article class="club-card">` containing: rank badge (circular, `--font-size-lg` numeral; rank 1/2/3 use `--color-gold`/`--color-silver`/`--color-bronze` backgrounds with white numeral, others `--color-bg` with `--color-text-muted`); name block (club name `--font-size-lg` weight 600 + movement line `--font-size-xs`); score block right-aligned (total `--font-size-2xl` weight 700 `--color-primary`). Whole card is a `<button>`-role tap target toggling the breakdown. Top-3 cards get a subtle left border in their medal color token.

### Movement display

Movement line under the club name: `▲ +12 since last snapshot` (`--color-success`), `▼ −4` (`--color-error`), `— no change` or `— no snapshot yet` (`--color-text-muted`). Rank movement shown as a chip on the rank badge corner only when nonzero (`+1`/`−2`). Arrows always paired with signed numbers (accessibility: never color-only).

### ScoreBreakdown

Expands inside the card (max-height transition ≤200ms). Six rows: label + points, `--font-size-sm`, separators `--color-gray` at 30% opacity via color-mix; zero-point rows render muted. Footer row repeats the total.

### CalloutChips

Horizontal row above cards, wrapping on narrow screens: Leading Club (`--color-primary` bg, white text), Biggest Mover (`--color-yellow` bg, `--color-text` text; shows club + delta; "—" when no snapshot), Area Total (`--color-surface` bg, border `--color-gray`). Each chip: label `--font-size-xs` uppercase + value `--font-size-sm` weight 600.

### Snapshot flow

"Save weekly snapshot" is a full-width primary button below the cards (`--color-primary` bg). Tapping opens Sheet: date input (default today, editable), 6-row preview of totals, Confirm/Cancel. Confirm pushes `{date, scores}` (scores = full computeScores output), prunes to 60, saves, toasts. **Movement always compares live scores against `snapshots[last]`** — taking a snapshot therefore zeroes movement until data changes again (same as the workbook's copy-to-Previous ritual).

### State shape addition

None — `snapshots` already in DEFAULT_STATE. New pure helpers in CORE: `saveSnapshot(state, date)` (returns new snapshots array, enforces prune-to-60 and replaces an existing snapshot with the same date) and `areaTotals(scores)`. Both exposed on `window.A4` for tests.
