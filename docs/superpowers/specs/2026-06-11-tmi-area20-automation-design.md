# Design — TMI Area 20 Automation

**Parent app:** i-Differentiate Area 4
**Approved approach:** GitHub Pages-compatible automation via GitHub Actions and generated static JSON
**Source:** `https://dashboards.toastmasters.org/Club.aspx?id=90`

## Problem

The app currently supports TMI updates by uploading a Club Performance CSV. A direct browser fetch from Toastmasters is not reliable from GitHub Pages or `file://` because cross-origin browser requests can be blocked. The user wants automated pulls for the clubs that are currently **District 90 Area 20**, because those clubs become the future Area 4 roster from July.

The live Club Performance page for District 90 currently lists Area 20 with these clubs:

- Blacktown City (`3378`)
- Prospect Phoenix Toastmasters Club (`4875`)
- Quakers Hill Club (`9448`)
- Rooty Hill Toastmasters Club (`9627`)
- Marsden Park Toastmasters Club (`28679342`)

The app seed roster also includes Holroyd. Automation must not silently remove or rewrite the app roster.

## Goals

- Preserve the static hosting model: the public app still works from GitHub Pages and keeps a single-file `index.html` deliverable.
- Pull current Area 20 Club Performance data automatically without requiring the Area Director to download/upload CSV every week.
- Keep CSV upload as the fallback path.
- Reuse the existing preview-confirm flow so fetched data is never applied silently.
- Make generated data auditable in git.

## Non-Goals

- No backend database, accounts, auth, or hosted admin service.
- No client-side scraping of Toastmasters pages from the browser.
- No automatic weekly snapshot after refresh; the Area Director still presses "Save weekly snapshot" after reviewing data.
- No automatic roster migration. Missing/unmatched clubs are reported, not silently added or deleted.

## Architecture

### Scheduled Fetch

Add `.github/workflows/update-tmi-area20.yml`.

The workflow runs:

- on `workflow_dispatch`
- on a weekly cron

It runs `scripts/update-tmi-area20.mjs`, which:

1. Fetches `https://dashboards.toastmasters.org/Club.aspx?id=90`.
2. Finds the `Area 20` section in the Club Performance page.
3. Parses club rows until the next area/division separator.
4. Normalizes those rows into the same fields the app already uses for TMI scoring.
5. Writes `data/tmi-area20.json`.
6. Commits the generated JSON only when it changed.

The workflow should use the default `GITHUB_TOKEN` with `contents: write`.

### Generated File Contract

`data/tmi-area20.json` is the only public data artifact the app reads.

Shape:

```json
{
  "schemaVersion": 1,
  "source": {
    "district": "90",
    "sourceArea": "20",
    "futureArea": "4",
    "url": "https://dashboards.toastmasters.org/Club.aspx?id=90",
    "fetchedAt": "2026-06-11T00:00:00.000Z",
    "asOf": "As of 16-Apr-2026"
  },
  "clubs": [
    {
      "clubNumber": "3378",
      "clubName": "Blacktown City",
      "tmi": {
        "base": 20,
        "current": 18,
        "goals": [true, true, true, true, true, true, true, false, true, true],
        "distinguished": null,
        "duesOct": true,
        "duesApr": true,
        "officerList": true,
        "cotRounds": 2
      }
    }
  ],
  "parseWarnings": []
}
```

`goals` are derived with the existing workbook thresholds:

- G1: Level 1 awards >= 4
- G2: Level 2 awards >= 2
- G3: Additional Level 2 awards >= 2
- G4: Level 3 awards >= 2
- G5: Level 4 / Path Completion / DTM awards >= 1
- G6: Additional Level 4 / Path Completion / DTM awards >= 1
- G7: New members >= 4
- G8: Additional new members >= 4
- G9: both officer training rounds >= 4
- G10: dues renewal and officer list on time

For the page table columns, `9a`, `9b`, `10a`, and `10b` map to the data needed for G9/G10 and admin flags. The app should continue to compute its leaderboard scores from stored TMI state rather than trusting any Toastmasters "goals met" total directly.

### App Refresh Flow

Change the TMI screen refresh button order:

1. Try `fetch("data/tmi-area20.json", { cache: "no-store" })`.
2. Validate `schemaVersion === 1` and `clubs` is an array.
3. Convert the generated JSON into the existing `mapTmiCsv`-style result shape: `{ updates, matched, unmatchedClubs, unmappedFields, skippedRows }`.
4. Open the existing results Sheet.
5. Confirm applies `applyTmiUpdates`; Cancel discards.
6. If generated JSON is missing, stale, malformed, or no app clubs match, fall back to the current Toastmasters CSV fetch/upload path and FileDrop instructions.

The generated-data path matches clubs using the existing club matching rules:

- club number first, after stripping leading zeroes
- normalized name fallback

This means Prospect Phoenix should now match by number once the app seed/config has `4875`; until then it can still match by normalized name.

### Roster Mismatch Behavior

The generated data is source-of-truth for Area 20 performance values, not for the app roster.

- App club exists and generated data matches: update that club's TMI fields after confirmation.
- Generated club does not exist in the app: show it as unmatched in the preview.
- App club has no generated match, such as Holroyd: show a missing-data note in the preview and leave its current TMI values untouched.
- Never add, remove, or rename clubs during refresh.

### Staleness

The app should display generated metadata in the preview:

- fetched timestamp
- Toastmasters "as of" label when available
- source area 20 / future area 4 note

If `fetchedAt` is more than 14 days old, show a warning in the preview but still allow confirmation. This keeps the app usable if GitHub Actions is temporarily unavailable.

## Error Handling

- Fetch `404` for `data/tmi-area20.json`: use existing CSV fallback.
- Invalid JSON or wrong schema version: Toast error + CSV fallback.
- Parser script cannot locate Area 20: fail the GitHub Action and leave the last committed JSON untouched.
- Toastmasters markup changes: script should emit a clear error and include a short source snippet around the failed area search in CI logs.
- No matched app clubs: show an error and do not apply.

## Testing

Automated tests:

- Add script parser fixture tests using a saved representative Club Performance HTML snippet containing Area 20.
- Verify all five Area 20 clubs are parsed.
- Verify generated JSON converts to the app update shape.
- Verify app refresh validation rejects malformed generated JSON.
- Keep the existing `tests.html` headless suite green.

Manual verification:

- Run the update script locally or in GitHub Actions and inspect `data/tmi-area20.json`.
- Serve the app over HTTP, click Refresh from TMI, confirm the preview references Area 20/future Area 4, then apply.
- Confirm matching clubs update and Holroyd remains unchanged with a missing-data note.

## Compatibility Constraint

The current app stores Prospect Phoenix with `clubNumber: null` in some older state copies. Automation should not require users to reset localStorage. Name fallback must remain available, and Settings should continue to allow filling `4875`.
