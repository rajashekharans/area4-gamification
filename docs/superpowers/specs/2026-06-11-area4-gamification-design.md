# i-Differentiate Area 4 — Design Spec

**Date:** 2026-06-11
**Status:** Approved (requirements supplied in full by Area Director; decisions made autonomously where noted)
**Source of truth for scoring:** `Area4_Gamification_Tracker.xlsx` (extracted 2026-06-11; formulas replicated below)

## What we're building

A **single-file HTML web app** (`index.html`) that replaces the Area 4 gamification Excel workbook. It is a club-performance leaderboard for Area 4, District 90 (NSW, Australia), shared with members via WhatsApp links and viewed mostly on phones. The Area Director updates it weekly from the TMI dashboards CSV and club meeting minutes; members open it read-only to see rankings.

Everything runs client-side. No backend, no build step, no accounts.

## Decisions made autonomously (user not present)

| Decision | Choice | Why |
|---|---|---|
| Framework | Vanilla JS + CSS custom properties, single file | "Single-file HTML" is a hard requirement; frameworks add a build step |
| Charting | Chart.js 4.x UMD via jsdelivr CDN | Required by brief; degrades to an HTML table when offline |
| Minutes ingestion | Structured manual-entry forms (per club) + a paste-text quick-parse helper that pre-fills the form from common minute phrases ("12 members attended", "3 guests") | Full NLP of minutes is out of scope for a client-only app; the helper covers the 80% case and the form is always the fallback |
| Attendance units | Entered as whole percent (0–100) in UI; thresholds ≥75 and ≥50 | Workbook stores fractions (0.75); percent is friendlier on a phone keypad. Conversion documented in scoring engine |
| Prospect Phoenix club number | Stored as `null` (editable in Settings) | Not present in the public TMI Find-a-Club directory as of 2026-06-11 — likely newly chartered/renamed; user can fill it in |
| Snapshot cadence | Manual "Save weekly snapshot" button (no auto-save) | Matches the workbook's deliberate weekly ritual; avoids accidental mid-edit snapshots |

## UI Design System

### A1. Color tokens

Toastmasters brand palette (per TM brand manual) plus functional colors:

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#004165` | Loyal Blue — header, primary buttons, active tab |
| `--color-accent` | `#772432` | True Maroon — callouts, destructive-adjacent emphasis, chart accents |
| `--color-gray` | `#A9B2B1` | TM Cool Gray — borders, disabled |
| `--color-yellow` | `#F2DF74` | TM Happy Yellow — highlights, "Biggest Mover" chip |
| `--color-bg` | `#F4F6F8` | App background |
| `--color-surface` | `#FFFFFF` | Cards, sheets |
| `--color-text` | `#1A2B33` | Body text |
| `--color-text-muted` | `#5B6B73` | Secondary text |
| `--color-success` | `#1E7B4F` | Positive movement arrows, growth |
| `--color-error` | `#B3261E` | Negative movement, validation errors |
| `--color-gold` | `#D4A017` | Rank 1 medal styling |
| `--color-silver` | `#8E979E` | Rank 2 medal styling |
| `--color-bronze` | `#B08D57` | Rank 3 medal styling |

### A2. Typography tokens

No webfonts (single-file, offline-friendly): system stack.

| Token | Value |
|---|---|
| `--font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| `--font-size-xs` | `12px` (captions, chip labels) |
| `--font-size-sm` | `14px` (secondary text, table cells) |
| `--font-size-base` | `16px` (body, inputs) |
| `--font-size-lg` | `18px` (card titles) |
| `--font-size-xl` | `22px` (screen titles, final scores) |
| `--font-size-2xl` | `28px` (leaderboard hero score) |
| Weights | 400 regular, 600 semibold, 700 bold |

### A3. Spacing scale

4px base. Tokens: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`, `--space-6: 32px`. Radii: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`. Touch targets ≥ 44px.

### A4. Component library

**Custom library, named "A4 Kit"** — a fixed set of CSS class blocks + JS render functions inside the single file. No external UI dependency. Components:

| Component | Purpose |
|---|---|
| `AppShell` | Sticky brand header + bottom tab bar (5 tabs), screen container |
| `ClubCard` | Ranked leaderboard card: rank medal, club name, final score, movement arrow, tap-to-expand |
| `ScoreBreakdown` | Expandable section inside ClubCard: 6 category rows (DCP, Distinguished, Membership, Admin, Awards, Health) |
| `CalloutChip` | "Leading Club" / "Biggest Mover" / "Area Total" summary chips above the leaderboard |
| `TrendChart` | Chart.js line chart wrapper with offline table fallback |
| `FormRow` | Label + input/select row used on all entry screens |
| `NumberStepper` | − / value / + control for count fields (goals, guests, wins) |
| `ToggleChip` | On/off pill for boolean flags (dues on time, officer list, DCP goal met) |
| `ClubPicker` | Horizontal scrollable club selector on entry screens |
| `Sheet` | Bottom sheet modal (snapshot confirm, CSV column report, import preview) |
| `Toast` | Transient confirmation/error message |
| `FileDrop` | CSV/JSON file picker + drag target |
| `SettingsList` | Grouped editable weight rows and config rows |

### A5. Screen inventory

Five screens via bottom tab bar (hash-routed: `#leaderboard`, `#tmi`, `#manual`, `#trends`, `#settings`):

1. **Leaderboard** (home) — callout chips, ranked ClubCards with score breakdown on tap, movement arrows vs last snapshot, trophy/medal styling for top 3, "Save weekly snapshot" button.
2. **TMI Data** — "Refresh from TMI" button, FileDrop CSV fallback, last-sync stamp, per-club editable TMI fields (membership base/current, 10 DCP goal toggles, distinguished status, dues/officer-list/COT flags).
3. **Manual Entry** — ClubPicker; two sections per club: Awards (Smedley, Talk Up, Beat the Clock, Triple Crowns, Area/Division/District contest wins) and Club Health (meetings held, avg attendance %, guests, conversions) + paste-minutes quick-parse helper.
4. **Trends** — Chart.js weekly score line chart per club (built from snapshots), snapshot history list with delete.
5. **Settings** — all 21 scoring weights/caps editable, club config (names + club numbers), program year, Export JSON / Import JSON, "Reset to seed data".

## Architecture

### B1. Tech stack

- **Frontend:** single `index.html`; vanilla ES2020 JavaScript, CSS custom properties. No framework, no build step.
- **Backend:** none.
- **Runtime/host:** any static file host (GitHub Pages recommended for WhatsApp-shareable link); also works opened from `file://`.
- **Only external dependency:** Chart.js 4.x UMD from jsdelivr CDN, loaded with `defer`; app must fully function (minus chart) when the CDN is unreachable.

### B2. Data model

One root object persisted to localStorage under key `idiff-area4-v1`:

```
AppState {
  version: 1,
  config: {
    district: 90, area: 4, programYear: "2025-2026",
    clubs: [ { id, name, clubNumber|null } x6 ]
  },
  weights: {                      // 21 keys: 19 workbook weights + 2 caps (guestCap, meetingCap)
                                  // that the workbook hardcodes inside formulas; defaults below
    dcpGoal: 5, distD: 10, distS: 15, distP: 25,
    memberGrowth: 2, memberBonus20: 5,
    duesOnTime: 5, officerList: 5, cotRound: 5,
    d90Award: 5, tripleCrown: 5, contestArea: 3, contestDivision: 5, contestDistrict: 10,
    attendance75: 5, attendance50: 3, perGuest: 1, guestCap: 10,
    perConversion: 5, perMeeting: 1, meetingCap: 5
  },
  tmi:    { [clubId]: { base, current, goals: [0|1 x10], distinguished: ""|"D"|"S"|"P",
                        duesOct: 0|1, duesApr: 0|1, officerList: 0|1, cotRounds: 0|1|2 } },
  awards: { [clubId]: { smedley, talkUp, beatTheClock, tripleCrowns, areaWins, divWins, distWins } },
  health: { [clubId]: { meetings, attendancePct, guests, conversions } },
  snapshots: [ { date: "YYYY-MM-DD", scores: { [clubId]: { total, rank, breakdown: {dcp, dist, membership, admin, awards, health} } } } ],
  lastTmiSync: ISO string | null
}
```

Club ids: `marsden-park`, `quakers-hill`, `prospect-phoenix`, `blacktown-city`, `rooty-hill`, `holroyd`.

**Scoring engine** — one pure function `computeScores(state) -> { [clubId]: {total, rank, breakdown} }`, replicating workbook formulas exactly:

- `dcp = goalsMet × w.dcpGoal`
- `dist = P→w.distP | S→w.distS | D→w.distD | else 0`
- `membership = (current − base) × w.memberGrowth + (current ≥ 20 ? w.memberBonus20 : 0)`
- `admin = (duesOct + duesApr) × w.duesOnTime + officerList × w.officerList + cotRounds × w.cotRound`
- `awards = (smedley + talkUp + beatTheClock) × w.d90Award + tripleCrowns × w.tripleCrown + areaWins × w.contestArea + divWins × w.contestDivision + distWins × w.contestDistrict`
- `health = (attendancePct ≥ 75 ? w.attendance75 : attendancePct ≥ 50 ? w.attendance50 : 0) + min(guests × w.perGuest, w.guestCap) + conversions × w.perConversion + min(meetings × w.perMeeting, w.meetingCap)`
- `total = sum of the six`; rank by total descending (ties share rank, Excel RANK semantics).

Movement = comparison against the **latest snapshot** (score delta and rank delta), exactly like the workbook's Previous Score / Previous Rank columns.

### B3. Folder structure

```
area4-gamification/
├── index.html              # the entire application (deliverable)
├── README.md               # what it is, how to update weekly, how to host/share
├── sample-data/
│   └── tmi-club-performance-sample.csv   # realistic TMI export for testing upload flow
├── docs/superpowers/       # specs + plans (this file)
└── .planning/              # GSD project management
```

### B4. Integration boundaries

| Boundary | Detail |
|---|---|
| **TMI dashboards CSV** | `GET https://dashboards.toastmasters.org/<programYear>/export.aspx?type=CSV&report=clubperformance~90~~~<programYear>` (District 90 Club Performance). Fetched client-side on "Refresh from TMI". CORS is expected to block this from a static page → on failure, show the FileDrop fallback with instructions ("open dashboards.toastmasters.org → District 90 → Club Performance → Export CSV, then drop the file here"). Parser matches clubs **by club number first, club name (normalized) second**, and maps columns by fuzzy header match (TMI renames headers between program years). Unmatched clubs/columns are reported in a Sheet, never silently dropped. |
| **Chart.js CDN** | jsdelivr; `defer`; feature-detect `window.Chart`, fall back to score-history table |
| **localStorage** | key `idiff-area4-v1`; schema version field for future migration |
| **JSON export/import** | Export = Blob download `idiff-area4-backup-YYYY-MM-DD.json` of full AppState; Import validates `version` + club ids in a preview Sheet before overwriting |

No auth, no server, no analytics, no PII beyond club-level aggregates.

### B5. Non-functional constraints

- **Mobile-first:** designed at 360px width; must be comfortable one-handed; viewed from WhatsApp in-app browser.
- **Offline-tolerant:** all features except TMI fetch and chart work with no network; chart degrades to table.
- **Accessibility:** WCAG AA contrast on all token pairs, semantic HTML (nav/main/button), touch targets ≥44px, movement arrows paired with text (not color-only).
- **Performance:** index.html ≤ 150KB excluding Chart.js; first paint < 1s on mid-range phone.
- **Data safety:** snapshots capped at 60 (oldest pruned); import never overwrites without preview confirm; export filename dated.

## Seed data (from workbook, as at 2026-07-01 baseline)

| Club | Club # | Base | Current |
|---|---|---|---|
| Marsden Park Toastmasters | 28679342 | 18 | 18 |
| Quakers Hill Toastmasters | 00009448 | 22 | 22 |
| Prospect Phoenix Toastmasters | (TBC — edit in Settings) | 15 | 15 |
| Blacktown City Toastmasters | 00003378 | 20 | 20 |
| Rooty Hill Toastmasters | 00009627 | 14 | 14 |
| Holroyd Toastmasters | 00007851 | 16 | 16 |

All DCP goals, awards, and health values seed at 0; distinguished status blank; no snapshots. Weights seed to the workbook values listed in B2.

## Error handling

- TMI fetch failure (CORS/network) → toast + automatic reveal of FileDrop fallback. Never a dead end.
- CSV parse: per-row try/catch; report skipped rows and unmatched headers in a Sheet.
- Import JSON: schema validation with explicit error list; rejected import leaves current state untouched.
- localStorage write failure (quota/private mode) → toast warning that changes won't persist; app keeps working in memory.
- Weight inputs clamp to 0–100 integers; attendance 0–100; memberships 0–500.

## Testing approach

Single-file constraint rules out a test framework dependency in the deliverable, so:
- Scoring engine + CSV parser written as pure functions in a `<script>` block, structured so they can be extracted.
- A companion `tests.html` (not shipped/linked) loads index.html's pure functions and runs assertion checks: workbook-parity scoring cases (including the ≥20 bonus boundary, attendance 75/50 boundaries, guest/meeting caps, tie ranking), CSV header-mapping cases, import validation cases.
- Manual verification via browser preview on 360px viewport.
