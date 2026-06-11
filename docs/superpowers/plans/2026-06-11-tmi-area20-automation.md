# TMI Area 20 Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate District 90 Area 20 TMI data pulls for the future Area 4 roster, auto-save snapshots after confirmed imports, and show club progress on leaderboard cards and the Trends screen.

**Architecture:** A scheduled GitHub Action runs a dependency-free Node script that fetches the Toastmasters Club Performance page, extracts Area 20 rows, and commits `data/tmi-area20.json`. The static app first reads that generated same-origin JSON, falls back to the existing CSV upload path, gates every import behind the existing preview Sheet, and saves today’s snapshot after confirmed apply. Progress UI is computed from the existing `snapshots` array; no second history store is introduced.

**Tech Stack:** Vanilla ES2020 in `index.html`, dependency-free Node scripts, GitHub Actions, existing `tests.html` CORE extraction harness.

---

## File Structure

- Create `.github/workflows/update-tmi-area20.yml`: scheduled/manual workflow that runs the update script and commits `data/tmi-area20.json` when changed.
- Create `scripts/tmi-area20-core.mjs`: dependency-free parser/generator library. Exports `parseClubPerformanceHtml`, `buildArea20Payload`, and constants for source URL/areas.
- Create `scripts/update-tmi-area20.mjs`: CLI wrapper that fetches Toastmasters, calls the core parser, and writes `data/tmi-area20.json`.
- Create `scripts/test-tmi-area20.mjs`: Node assertions for parser fixture and generated payload.
- Create `scripts/fixtures/club-performance-area20.html`: minimal representative fixture copied from the live Club Performance page structure for Area 20.
- Create `data/.gitkeep`: keeps the generated data directory in git before the first workflow run.
- Modify `index.html`: add CORE helpers for generated JSON mapping/progress; update TMI refresh/apply flow; add leaderboard progress and Trends club-progress UI.
- Modify `tests.html`: add assertions for generated JSON mapping, auto-snapshot semantics, and progress helpers.
- Modify `README.md`: document automated refresh, GitHub Action, generated data, and auto-snapshot behavior.

---

## Task 1: Parser Library, Fixture, CLI, and GitHub Action

**Files:**
- Create: `scripts/fixtures/club-performance-area20.html`
- Create: `scripts/tmi-area20-core.mjs`
- Create: `scripts/test-tmi-area20.mjs`
- Create: `scripts/update-tmi-area20.mjs`
- Create: `data/.gitkeep`
- Create: `.github/workflows/update-tmi-area20.yml`
- Test: `scripts/test-tmi-area20.mjs`

- [ ] **Step 1: Create the parser fixture**

Create `scripts/fixtures/club-performance-area20.html` with this representative Area 20 block:

```html
<!doctype html>
<html>
<body>
<h1>Club Performance for District 90</h1>
As of 16-Apr-2026
Division W
Area 20
CSP Membership Goals Education Mem.Trn.Rn.|Lst.
Base To Date Net Met 1 2 3 4 5 6 7 8 9a 9b 10a 10b
00003378&nbsp;Blacktown City Y 20 18-2 9 5 2 3 5 1 1 4 0 7 7 2 1
00004875&nbsp;Prospect Phoenix Toastmasters Club Y 6 8 2 6 0 2 1 3 1 2 3 0 4 6 1 1
00009448&nbsp;Quakers Hill Club Y 25 23-2 7 4 2 0 0 1 0 4 11 7 7 2 1
00009627&nbsp;Rooty Hill Toastmasters Club Y 11 9-2 7 4 2 2 0 1 1 2 0 6 4 2 1
28679342&nbsp;Marsden Park Toastmasters Club
Charter 10/01/25 Y 20 9-11 3 1 0 0 0 1 0 0 0 0 6 2 1
Area 28
CSP Membership Goals Education Mem.Trn.Rn.|Lst.
00002716&nbsp;Nepean Valley Toastmasters Club Y 20 18-2 3 1 1 0 1 1 0 3 0 6 5 2 1
</body>
</html>
```

- [ ] **Step 2: Write the parser library**

Create `scripts/tmi-area20-core.mjs`:

```js
import { writeFile } from "node:fs/promises";

export const SOURCE_URL = "https://dashboards.toastmasters.org/Club.aspx?id=90";
export const DISTRICT = "90";
export const SOURCE_AREA = "20";
export const FUTURE_AREA = "4";

function decodeHtml(text) {
  return String(text)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|tr|li|h\d|table|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n");
}

function toInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`Expected integer for ${label}, got ${JSON.stringify(value)}`);
  return n;
}

function deriveDistinguished(csp, current, net, goalsMet) {
  if (csp !== "Y") return "";
  if (goalsMet >= 9 && current >= 20) return "P";
  if (goalsMet >= 7 && (current >= 20 || net >= 5)) return "S";
  if (goalsMet >= 5 && (current >= 20 || net >= 3)) return "D";
  return "";
}

function parseClubRow(rowText) {
  const compact = rowText.replace(/\s+/g, " ").trim();
  const match = compact.match(/^(\d{8})\s+(.+?)\s+(?:Charter\s+\d{2}\/\d{2}\/\d{2}\s+|Susp\s+\d{2}\/\d{2}\/\d{2}\s+)?([YN])\s+(.+)$/);
  if (!match) throw new Error(`Could not parse club row: ${compact}`);

  const clubNumber = String(Number(match[1]));
  const clubName = match[2].trim();
  const csp = match[3];
  const tokens = match[4].trim().split(/\s+/);

  const base = toInt(tokens[0], `${clubName} base`);
  let current;
  let net;
  let index;
  const toDateNet = tokens[1].match(/^(\d+)-(\d+)$/);
  if (toDateNet) {
    current = toInt(toDateNet[1], `${clubName} current`);
    net = -toInt(toDateNet[2], `${clubName} net`);
    index = 2;
  } else {
    current = toInt(tokens[1], `${clubName} current`);
    net = toInt(tokens[2], `${clubName} net`);
    index = 3;
  }

  const goalsMet = toInt(tokens[index++], `${clubName} goals met`);
  const values = tokens.slice(index).map((token, i) => toInt(token, `${clubName} value ${i + 1}`));
  if (values.length < 12) {
    throw new Error(`Expected 12 goal/admin values for ${clubName}, got ${values.length}`);
  }

  const [l1, l2, addL2, l3, l4, addL4, newMembers, addNewMembers, cot1, cot2, tenA, tenB] = values;
  const duesOct = tenA >= 1 ? 1 : 0;
  const duesApr = tenA >= 2 ? 1 : 0;
  const officerList = tenB >= 1 ? 1 : 0;

  return {
    clubNumber,
    clubName,
    tmi: {
      base,
      current,
      goals: [
        l1 >= 4 ? 1 : 0,
        l2 >= 2 ? 1 : 0,
        addL2 >= 2 ? 1 : 0,
        l3 >= 2 ? 1 : 0,
        l4 >= 1 ? 1 : 0,
        addL4 >= 1 ? 1 : 0,
        newMembers >= 4 ? 1 : 0,
        addNewMembers >= 4 ? 1 : 0,
        cot1 >= 4 && cot2 >= 4 ? 1 : 0,
        (duesOct || duesApr) && officerList ? 1 : 0
      ],
      distinguished: deriveDistinguished(csp, current, net, goalsMet),
      duesOct,
      duesApr,
      officerList,
      cotRounds: (cot1 >= 4 ? 1 : 0) + (cot2 >= 4 ? 1 : 0)
    }
  };
}

export function parseClubPerformanceHtml(html) {
  const text = decodeHtml(html);
  const asOf = (text.match(/As of\s+\d{1,2}-[A-Za-z]{3}-\d{4}/) || [null])[0];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const areaIndex = lines.findIndex((line) => /^Area\s+20\b/.test(line));
  if (areaIndex < 0) {
    const areaHint = lines.filter((line) => /^Area\s+\d+\b/.test(line)).slice(-8).join(" | ");
    throw new Error(`Could not locate Area 20 in Club Performance page. Nearby areas: ${areaHint}`);
  }

  const rows = [];
  for (let i = areaIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^Area\s+\d+\b/.test(line) || /^Division\s+\w+\b/.test(line) || /^©/.test(line)) break;
    if (!/^\d{8}\b/.test(line)) continue;

    let row = line;
    while (!/\s[YN]\s+\d+/.test(row) && i + 1 < lines.length) {
      i += 1;
      row += " " + lines[i];
    }
    rows.push(parseClubRow(row));
  }

  if (rows.length === 0) throw new Error("Area 20 was found but no club rows were parsed.");
  return { asOf, clubs: rows };
}

export function buildArea20Payload(html, fetchedAt = new Date().toISOString()) {
  const parsed = parseClubPerformanceHtml(html);
  return {
    schemaVersion: 1,
    source: {
      district: DISTRICT,
      sourceArea: SOURCE_AREA,
      futureArea: FUTURE_AREA,
      url: SOURCE_URL,
      fetchedAt,
      asOf: parsed.asOf
    },
    clubs: parsed.clubs,
    parseWarnings: []
  };
}

export async function writeArea20Payload(path, payload) {
  await writeFile(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
```

- [ ] **Step 3: Write parser tests**

Create `scripts/test-tmi-area20.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildArea20Payload, parseClubPerformanceHtml } from "./tmi-area20-core.mjs";

const html = await readFile("scripts/fixtures/club-performance-area20.html", "utf8");
const parsed = parseClubPerformanceHtml(html);

assert.equal(parsed.asOf, "As of 16-Apr-2026");
assert.deepEqual(parsed.clubs.map((club) => club.clubNumber), ["3378", "4875", "9448", "9627", "28679342"]);
assert.deepEqual(parsed.clubs.map((club) => club.clubName), [
  "Blacktown City",
  "Prospect Phoenix Toastmasters Club",
  "Quakers Hill Club",
  "Rooty Hill Toastmasters Club",
  "Marsden Park Toastmasters Club"
]);

const blacktown = parsed.clubs.find((club) => club.clubNumber === "3378");
assert.equal(blacktown.tmi.base, 20);
assert.equal(blacktown.tmi.current, 18);
assert.deepEqual(blacktown.tmi.goals, [1, 1, 1, 1, 1, 1, 1, 0, 1, 1]);
assert.equal(blacktown.tmi.distinguished, "");
assert.equal(blacktown.tmi.duesOct, 1);
assert.equal(blacktown.tmi.duesApr, 1);
assert.equal(blacktown.tmi.officerList, 1);
assert.equal(blacktown.tmi.cotRounds, 2);

const marsden = parsed.clubs.find((club) => club.clubNumber === "28679342");
assert.equal(marsden.tmi.base, 20);
assert.equal(marsden.tmi.current, 9);
assert.deepEqual(marsden.tmi.goals, [0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

const payload = buildArea20Payload(html, "2026-06-11T00:00:00.000Z");
assert.equal(payload.schemaVersion, 1);
assert.equal(payload.source.district, "90");
assert.equal(payload.source.sourceArea, "20");
assert.equal(payload.source.futureArea, "4");
assert.equal(payload.source.fetchedAt, "2026-06-11T00:00:00.000Z");
assert.equal(payload.clubs.length, 5);
assert.deepEqual(payload.parseWarnings, []);

console.log("tmi-area20 parser tests passed");
```

- [ ] **Step 4: Run parser tests and verify they fail if the library is missing**

Run:

`node scripts/test-tmi-area20.mjs`

Expected before Step 2 is complete: module/file-not-found failure. Expected after Step 2 is complete: `tmi-area20 parser tests passed`.

- [ ] **Step 5: Write the update CLI**

Create `scripts/update-tmi-area20.mjs`:

```js
#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { buildArea20Payload, SOURCE_URL, writeArea20Payload } from "./tmi-area20-core.mjs";

const outputPath = process.argv[2] || "data/tmi-area20.json";

const response = await fetch(SOURCE_URL, {
  headers: {
    "user-agent": "area4-gamification/1.0 (+https://github.com)"
  }
});

if (!response.ok) {
  throw new Error(`Toastmasters fetch failed: HTTP ${response.status}`);
}

const html = await response.text();
const payload = buildArea20Payload(html);
await mkdir(dirname(outputPath), { recursive: true });
await writeArea20Payload(outputPath, payload);

console.log(`Wrote ${outputPath}: ${payload.clubs.length} Area ${payload.source.sourceArea} clubs, ${payload.source.asOf || "no as-of label"}`);
```

- [ ] **Step 6: Add data directory placeholder**

Create an empty `data/.gitkeep`.

- [ ] **Step 7: Add the GitHub Action**

Create `.github/workflows/update-tmi-area20.yml`:

```yaml
name: Update TMI Area 20 data

on:
  workflow_dispatch:
  schedule:
    - cron: "15 18 * * 1"

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Test parser
        run: node scripts/test-tmi-area20.mjs
      - name: Fetch and write generated data
        run: node scripts/update-tmi-area20.mjs
      - name: Commit generated data
        run: |
          if git diff --quiet -- data/tmi-area20.json; then
            echo "No TMI data changes"
            exit 0
          fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/tmi-area20.json
          git commit -m "data: update TMI Area 20 snapshot"
          git push
```

- [ ] **Step 8: Verify and commit Task 1**

Run:

`node scripts/test-tmi-area20.mjs`

Expected: `tmi-area20 parser tests passed`.

Do not require live network locally for this task. If live network is available, also run:

`node scripts/update-tmi-area20.mjs /tmp/tmi-area20.json`

Expected: writes JSON with 5 clubs. If network is unavailable, rely on the fixture test and GitHub Action runtime.

Commit:

```bash
git add .github/workflows/update-tmi-area20.yml scripts/tmi-area20-core.mjs scripts/update-tmi-area20.mjs scripts/test-tmi-area20.mjs scripts/fixtures/club-performance-area20.html data/.gitkeep
git commit -m "feat: add TMI Area 20 data updater"
```

---

## Task 2: CORE Helpers for Generated Data and Progress

**Files:**
- Modify: `index.html` CORE region before `window.A4 = { ... }`
- Modify: `tests.html` CASES region
- Test: `tests.html`

- [ ] **Step 1: Add failing tests for generated data mapping**

In `tests.html`, inside `runCases` before the Phase 4 `validateImport` section, add:

```js
  // --- TMI Area 20 generated JSON mapping ---
  var gen = {
    schemaVersion: 1,
    source: {
      district: "90", sourceArea: "20", futureArea: "4",
      url: "https://dashboards.toastmasters.org/Club.aspx?id=90",
      fetchedAt: "2026-06-11T00:00:00.000Z",
      asOf: "As of 16-Apr-2026"
    },
    clubs: [
      { clubNumber: "3378", clubName: "Blacktown City", tmi: { base: 20, current: 18, goals: [1,1,1,1,1,1,1,0,1,1], distinguished: "", duesOct: 1, duesApr: 1, officerList: 1, cotRounds: 2 } },
      { clubNumber: "4875", clubName: "Prospect Phoenix Toastmasters Club", tmi: { base: 6, current: 8, goals: [0,1,0,1,1,1,0,0,1,1], distinguished: "", duesOct: 1, duesApr: 0, officerList: 1, cotRounds: 2 } },
      { clubNumber: "9448", clubName: "Quakers Hill Club", tmi: { base: 25, current: 23, goals: [1,1,0,0,1,0,1,1,1,1], distinguished: "S", duesOct: 1, duesApr: 1, officerList: 1, cotRounds: 2 } }
    ],
    parseWarnings: []
  };
  var genMap = A4.mapGeneratedTmi(gen, DS);
  assertEq("mapGeneratedTmi: generated JSON maps app clubs by number/name",
    Object.keys(genMap.updates).sort(),
    ["blacktown-city", "prospect-phoenix", "quakers-hill"]);
  assertEq("mapGeneratedTmi: preserves metadata",
    [genMap.source.sourceArea, genMap.source.futureArea, genMap.source.asOf],
    ["20", "4", "As of 16-Apr-2026"]);
  assertEq("mapGeneratedTmi: reports app clubs missing from generated data",
    genMap.missingAppClubs.sort(),
    ["holroyd", "marsden-park", "rooty-hill"]);

  assertEq("mapGeneratedTmi: rejects wrong schema",
    A4.validateGeneratedTmi({ schemaVersion: 99, clubs: [] }).ok, false);
```

- [ ] **Step 2: Add failing tests for progress helpers**

Still before `validateImport`, add:

```js
  // --- Progress helpers from snapshots ---
  var progState = clone();
  progState.snapshots = A4.saveSnapshot(progState, "2026-06-01");
  progState.tmi["marsden-park"].goals = [1,1,1,1,1,1,1,1,1,1];
  progState.snapshots = A4.saveSnapshot(progState, "2026-06-08");
  progState.tmi["marsden-park"].current = 25;
  var progScores = A4.computeScores(progState);
  var prog = A4.clubProgress(progState, "marsden-park", progScores);
  assertEq("clubProgress: latest snapshot delta uses current scores",
    [prog.latest.scoreDelta, prog.latest.rankDelta],
    [19, 0]);
  assertEq("clubProgress: recent delta uses first-to-last available snapshot",
    [prog.recent.scoreDelta, prog.recent.rankDelta, prog.recent.count],
    [50, 2, 2]);

  var missingProgState = clone();
  missingProgState.snapshots = [{ date: "2026-06-01", scores: {} }];
  assertEq("clubProgress: tolerates missing club snapshot entries",
    A4.clubProgress(missingProgState, "marsden-park", A4.computeScores(missingProgState)).recent.count,
    0);
```

- [ ] **Step 3: Run tests and verify failure**

Run the headless suite:

`node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const tests=fs.readFileSync('tests.html','utf8'); const sample=fs.readFileSync('sample-data/tmi-club-performance-sample.csv','utf8'); const core=html.match(/\\/\\/ === CORE ===([\\s\\S]*?)\\/\\/ === UI ===/); const cases=tests.match(/\\/\\/ === CASES ===([\\s\\S]*?)\\/\\/ === END CASES ===/); const stubWindow={}; const localStorage={getItem(){return null}, setItem(){}}; const document={}; Function('window','localStorage','document', core[1])(stubWindow, localStorage, document); stubWindow.A4.sampleTmiCsv = sample; let pass=0; Function('window', cases[1]+'; window.runCases = runCases;')(stubWindow); stubWindow.runCases(stubWindow.A4, (name, actual, expected)=>{ const ok=JSON.stringify(actual)===JSON.stringify(expected); if(!ok){ console.error('FAIL '+name+' expected '+JSON.stringify(expected)+' got '+JSON.stringify(actual)); process.exitCode=1; } else pass++; }); if(process.exitCode) process.exit(process.exitCode); console.log(pass+' assertions passed');"`

Expected: failure because `mapGeneratedTmi`, `validateGeneratedTmi`, and `clubProgress` are not implemented.

- [ ] **Step 4: Implement generated data helpers in CORE**

In `index.html`, after `applyTmiUpdates` and before `extractMinutes`, add:

```js
function validateGeneratedTmi(obj) {
  if (!isPlainObject(obj)) return { ok: false, errors: ["Generated TMI data is not an object."] };
  var errors = [];
  if (obj.schemaVersion !== 1) errors.push("Generated TMI schema must be version 1.");
  if (!Array.isArray(obj.clubs)) errors.push("Generated TMI clubs must be a list.");
  if (!isPlainObject(obj.source)) errors.push("Generated TMI source metadata is missing.");
  if (Array.isArray(obj.clubs)) {
    obj.clubs.forEach(function (club, i) {
      if (!isPlainObject(club)) errors.push("Generated club " + (i + 1) + " is not an object.");
      else if (typeof club.clubName !== "string" || !isPlainObject(club.tmi)) {
        errors.push("Generated club " + (i + 1) + " needs clubName and tmi.");
      }
    });
  }
  return errors.length ? { ok: false, errors: errors } : { ok: true, errors: [] };
}

function mapGeneratedTmi(payload, state) {
  var valid = validateGeneratedTmi(payload);
  var result = {
    updates: {},
    matched: [],
    unmatchedClubs: [],
    unmappedFields: [],
    skippedRows: [],
    missingAppClubs: [],
    source: payload && payload.source ? payload.source : null,
    generated: true
  };
  if (!valid.ok) {
    result.skippedRows = valid.errors.map(function (error) {
      return { rowIndex: -1, reason: error };
    });
    return result;
  }

  var seen = {};
  payload.clubs.forEach(function (row, idx) {
    try {
      var club = null;
      var rowNum = normalizeClubNumber(row.clubNumber);
      if (rowNum !== "") {
        club = state.config.clubs.filter(function (c) {
          return c.clubNumber !== null && normalizeClubNumber(c.clubNumber) === rowNum;
        })[0] || null;
      }
      if (!club) {
        var rowName = normalizeClubName(row.clubName);
        club = state.config.clubs.filter(function (c) {
          return normalizeClubName(c.name) === rowName;
        })[0] || null;
      }
      if (!club) {
        result.unmatchedClubs.push(row.clubName || "(generated row " + (idx + 1) + ")");
        return;
      }

      var t = row.tmi;
      result.updates[club.id] = {
        base: clampGeneratedNum(t.base, 0, 500),
        current: clampGeneratedNum(t.current, 0, 500),
        goals: Array.isArray(t.goals) ? t.goals.slice(0, 10).map(function (g) { return g ? 1 : 0; }) : [0,0,0,0,0,0,0,0,0,0],
        distinguished: t.distinguished === "P" || t.distinguished === "S" || t.distinguished === "D" ? t.distinguished : "",
        duesOct: t.duesOct ? 1 : 0,
        duesApr: t.duesApr ? 1 : 0,
        officerList: t.officerList ? 1 : 0,
        cotRounds: clampGeneratedNum(t.cotRounds, 0, 2)
      };
      while (result.updates[club.id].goals.length < 10) result.updates[club.id].goals.push(0);
      result.matched.push(club.id);
      seen[club.id] = true;
    } catch (e) {
      result.skippedRows.push({ rowIndex: idx, reason: String(e && e.message ? e.message : e) });
    }
  });

  state.config.clubs.forEach(function (club) {
    if (!seen[club.id]) result.missingAppClubs.push(club.id);
  });
  return result;
}

function clampGeneratedNum(v, min, max) {
  var n = Math.round(Number(v));
  if (!isFinite(n)) n = min;
  return Math.min(max, Math.max(min, n));
}
```

- [ ] **Step 5: Implement progress helper in CORE**

After `saveSnapshot`, add:

```js
function clubProgress(state, clubId, currentScores) {
  var snapshots = (Array.isArray(state.snapshots) ? state.snapshots : [])
    .filter(function (snap) {
      return snap && snap.scores && snap.scores[clubId];
    });
  var current = currentScores && currentScores[clubId];
  var latestSnap = snapshots.length ? snapshots[snapshots.length - 1] : null;
  var latestScore = latestSnap ? latestSnap.scores[clubId] : null;
  var latest = latestScore && current
    ? { scoreDelta: current.total - latestScore.total, rankDelta: latestScore.rank - current.rank, date: latestSnap.date }
    : { scoreDelta: 0, rankDelta: null, date: null };

  var recentWindow = snapshots.slice(-4);
  var first = recentWindow[0] && recentWindow[0].scores[clubId];
  var last = recentWindow[recentWindow.length - 1] && recentWindow[recentWindow.length - 1].scores[clubId];
  var recent = first && last && recentWindow.length >= 2
    ? {
        scoreDelta: last.total - first.total,
        rankDelta: first.rank - last.rank,
        count: recentWindow.length,
        fromDate: recentWindow[0].date,
        toDate: recentWindow[recentWindow.length - 1].date
      }
    : { scoreDelta: 0, rankDelta: null, count: recentWindow.length, fromDate: null, toDate: null };

  var categoryDelta = {};
  CATEGORY_KEYS.forEach(function (key) {
    categoryDelta[key] = first && last ? last.breakdown[key] - first.breakdown[key] : 0;
  });
  recent.categoryDelta = categoryDelta;

  return { latest: latest, recent: recent, snapshots: snapshots };
}
```

Also add before `computeScores`:

```js
var CATEGORY_KEYS = ["dcp", "dist", "membership", "admin", "awards", "health"];
```

- [ ] **Step 6: Export helpers on `window.A4`**

Add to the `window.A4` object:

```js
  validateGeneratedTmi: validateGeneratedTmi,
  mapGeneratedTmi: mapGeneratedTmi,
  clubProgress: clubProgress,
```

- [ ] **Step 7: Run tests and commit Task 2**

Run the same headless suite from Step 3.

Expected: all assertions pass.

Commit:

```bash
git add index.html tests.html
git commit -m "feat: add generated TMI and progress core helpers"
```

---

## Task 3: App Import Flow, Generated JSON Fetch, and Auto-Snapshot

**Files:**
- Modify: `index.html` UI region around TMI ingestion wiring
- Test: `tests.html`

- [ ] **Step 1: Add shared apply helper in UI**

In `index.html`, before `openTmiResultsSheet(mapping)`, add:

```js
function applyTmiImport(mapping, updatedIds) {
  update(function (s) {
    var applied = applyTmiUpdates(s, mapping.updates);
    s.tmi = applied.tmi;
    s.lastTmiSync = applied.lastTmiSync;
    s.snapshots = saveSnapshot(s, localToday());
  });
  showToast("TMI data applied to " + updatedIds.length +
    " club" + (updatedIds.length === 1 ? "" : "s") +
    " and today's snapshot saved");
}
```

- [ ] **Step 2: Update `openTmiResultsSheet` metadata and missing-club display**

Inside `openTmiResultsSheet(mapping)`, after `skippedHtml`, add:

```js
  var sourceHtml = mapping.source
    ? '<p class="sheet-label">Source: District ' + esc(mapping.source.district) +
      ', Area ' + esc(mapping.source.sourceArea) + ' now / Area ' +
      esc(mapping.source.futureArea) + ' from July' +
      (mapping.source.asOf ? ' · ' + esc(mapping.source.asOf) : '') + '</p>'
    : "";

  var missingHtml = mapping.missingAppClubs && mapping.missingAppClubs.length
    ? '<p class="sheet-label">No generated data for app clubs: ' +
      esc(mapping.missingAppClubs.map(function (id) {
        return clubsById[id] ? clubsById[id].name : id;
      }).join(", ")) + '</p>'
    : "";
```

Change `bodyHtml` to include `sourceHtml` and `missingHtml`:

```js
    bodyHtml:
      sourceHtml +
      '<p class="sheet-label">Clubs to update (' + updatedIds.length + ')</p>' +
      updatedHtml + unmatchedHtml + missingHtml + unmappedHtml + skippedHtml,
```

- [ ] **Step 3: Replace the confirm state write with auto-snapshot apply**

In `openTmiResultsSheet(mapping)`, replace the current `update(function (s) { ... })` block and old Toast with:

```js
      applyTmiImport(mapping, updatedIds);
```

- [ ] **Step 4: Add generated JSON pipeline**

After `runIngestPipeline(text)`, add:

```js
function runGeneratedTmiPipeline(payload) {
  var mapping = mapGeneratedTmi(payload, state);
  if (!Object.keys(mapping.updates).length) {
    ingestFailure("No app clubs matched the generated TMI data. Upload the CSV instead.");
    return;
  }
  openTmiResultsSheet(mapping);
}

function fetchGeneratedTmi() {
  return fetch("data/tmi-area20.json", { cache: "no-store" }).then(function (res) {
    if (!res.ok) throw new Error("Generated TMI HTTP " + res.status);
    return res.json();
  }).then(function (payload) {
    var valid = validateGeneratedTmi(payload);
    if (!valid.ok) throw new Error(valid.errors.join("; "));
    runGeneratedTmiPipeline(payload);
  });
}
```

- [ ] **Step 5: Change refresh button order**

In `bindTmiSyncPanel`, replace the refresh handler body with:

```js
    refresh.disabled = true;
    fetchGeneratedTmi().catch(function () {
      return fetch(tmiCsvUrl(state)).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      }).then(function (text) {
        runIngestPipeline(text);
      }).catch(function () {
        ingestFailure("TMI fetch failed. Upload the CSV instead — steps below.");
      });
    }).finally(function () {
      refresh.disabled = false;
    });
```

- [ ] **Step 6: Run tests and commit Task 3**

Run the headless suite. Expected: all assertions pass.

Manual smoke test without browser automation:

`rg -n "data/tmi-area20.json|today's snapshot saved|missingAppClubs|fetchGeneratedTmi" index.html`

Expected: all four patterns present.

Commit:

```bash
git add index.html tests.html
git commit -m "feat: auto-snapshot confirmed TMI imports"
```

---

## Task 4: Leaderboard and Trends Club Progress UI

**Files:**
- Modify: `index.html` CSS if progress components need classes
- Modify: `index.html` UI region around `renderLeaderboard` and `renderTrends`
- Test: `tests.html`

- [ ] **Step 1: Add progress formatting helpers in UI**

After `movementLine(mv)`, add:

```js
function rankDeltaText(delta) {
  if (delta === null) return "rank —";
  if (delta > 0) return "rank up " + delta;
  if (delta < 0) return "rank down " + Math.abs(delta);
  return "rank unchanged";
}

function progressSummaryHtml(progress) {
  if (!progress.snapshots.length) {
    return '<div class="progress-box"><div class="progress-title">Progress</div>' +
      '<div class="progress-muted">Refresh TMI or save a snapshot to start tracking progress.</div></div>';
  }
  var recent = progress.recent.count >= 2
    ? '<div class="progress-line">Recent: ' + signed(progress.recent.scoreDelta) +
      ' over ' + progress.recent.count + ' snapshots · ' + rankDeltaText(progress.recent.rankDelta) + '</div>'
    : '<div class="progress-line">Recent: add one more snapshot for trend direction</div>';
  return '<div class="progress-box"><div class="progress-title">Progress</div>' +
    '<div class="progress-line">Latest: ' + signed(progress.latest.scoreDelta) +
      ' · ' + rankDeltaText(progress.latest.rankDelta) + '</div>' +
    recent + '</div>';
}
```

- [ ] **Step 2: Render progress inside expanded leaderboard cards**

Inside `renderLeaderboard`, in the card map, compute:

```js
    var progress = clubProgress(state, club.id, scores);
```

Then replace:

```js
      '<div class="breakdown">' + breakdownRows + '</div>' +
```

with:

```js
      '<div class="breakdown">' + breakdownRows + progressSummaryHtml(progress) + '</div>' +
```

- [ ] **Step 3: Add selected club state for Trends**

Near `var trendChart = null;`, add:

```js
var selectedTrendClubId = null;
```

Add helper:

```js
function ensureTrendClub(state) {
  if (!state.config.clubs.some(function (c) { return c.id === selectedTrendClubId; })) {
    selectedTrendClubId = state.config.clubs[0].id;
  }
  return selectedTrendClubId;
}

function trendClubPickerHtml(state) {
  return '<div class="club-picker">' + state.config.clubs.map(function (club) {
    return '<button type="button" class="picker-chip' +
      (club.id === selectedTrendClubId ? " active" : "") + '" data-trend-pick="' +
      esc(club.id) + '">' + esc(shortClubName(club.name)) + '</button>';
  }).join("") + '</div>';
}
```

- [ ] **Step 4: Add detailed progress renderer**

Before `renderTrends`, add:

```js
function clubProgressDetailHtml(state, scores) {
  var clubId = ensureTrendClub(state);
  var club = state.config.clubs.filter(function (c) { return c.id === clubId; })[0];
  var progress = clubProgress(state, clubId, scores);
  var current = scores[clubId];

  var categoryRows = CATEGORY_LABELS.map(function (cat) {
    return '<div class="bd-row">' +
      '<span>' + cat[1] + '</span><span>' + signed(progress.recent.categoryDelta[cat[0]]) + '</span></div>';
  }).join("");

  var historyRows = progress.snapshots.slice().reverse().map(function (snap) {
    var sc = snap.scores[clubId];
    return '<div class="history-row compact">' +
      '<div class="history-info"><div class="history-date">' + esc(snap.date) + '</div>' +
      '<div class="history-clubs">Rank ' + sc.rank + ' · ' +
        CATEGORY_LABELS.map(function (cat) { return cat[1] + ' ' + sc.breakdown[cat[0]]; }).join(' · ') +
      '</div></div><div class="history-total">' + sc.total + '</div></div>';
  }).join("");

  if (!historyRows) {
    historyRows = '<div class="empty-card">No snapshots for this club yet.</div>';
  }

  return '<section class="form-card progress-detail">' +
    '<h3 class="form-section-title">Club progress</h3>' +
    trendClubPickerHtml(state) +
    '<div class="progress-box">' +
      '<div class="progress-title">' + esc(club.name) + '</div>' +
      '<div class="progress-line">Current: ' + current.total + ' points · rank ' + current.rank + '</div>' +
      '<div class="progress-line">Latest: ' + signed(progress.latest.scoreDelta) + ' · ' + rankDeltaText(progress.latest.rankDelta) + '</div>' +
      '<div class="progress-line">Recent: ' + signed(progress.recent.scoreDelta) + ' over ' + progress.recent.count + ' snapshots · ' + rankDeltaText(progress.recent.rankDelta) + '</div>' +
    '</div>' +
    '<div class="breakdown progress-breakdown">' + categoryRows + '</div>' +
    '<h3 class="form-section-title">Snapshot history</h3>' +
    historyRows +
  '</section>';
}
```

- [ ] **Step 5: Integrate detailed progress in `renderTrends`**

At the start of `renderTrends`, after `var clubs = state.config.clubs;`, add:

```js
  var scores = computeScores(state);
```

For the empty state, change the empty text to:

```js
      '<div class="empty-card">No snapshots yet — refresh TMI or save one from the Leaderboard</div>';
```

Change the final `main.innerHTML` assignment to:

```js
  main.innerHTML = '<h2 class="screen-title">Trends</h2>' + chartCardHtml +
    clubProgressDetailHtml(state, scores) + historyHtml;
```

After delete-button bindings, add:

```js
  main.querySelectorAll("[data-trend-pick]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      selectedTrendClubId = chip.dataset.trendPick;
      render();
    });
  });
```

- [ ] **Step 6: Add CSS for progress UI**

Add token-only CSS near related card styles:

```css
.progress-box {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border: var(--border-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}
.progress-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  margin-bottom: var(--space-2);
}
.progress-line,
.progress-muted {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.progress-detail {
  margin-top: var(--space-4);
}
.progress-breakdown {
  max-height: none;
}
.history-row.compact {
  align-items: flex-start;
}
```

- [ ] **Step 7: Run tests and commit Task 4**

Run the headless suite. Expected: all assertions pass.

Manual smoke:

`rg -n "Club progress|progressSummaryHtml|selectedTrendClubId|data-trend-pick" index.html`

Expected: all patterns present.

Commit:

```bash
git add index.html tests.html
git commit -m "feat: show club progress from snapshots"
```

---

## Task 5: README, Verification, and Final Generated Data Check

**Files:**
- Modify: `README.md`
- Optional generated: `data/tmi-area20.json` if live fetch succeeds locally or through workflow
- Test: full local command suite

- [ ] **Step 1: Update README**

In `README.md`, update the TMI section to say:

```markdown
The hosted GitHub Pages app first looks for `data/tmi-area20.json`, generated by the repository's "Update TMI Area 20 data" GitHub Action. That file is built from District 90's current Area 20 Club Performance page, because those clubs become Area 4 from July.

After you confirm the TMI import preview, the app applies the data and automatically saves today's snapshot. Same-day refreshes replace today's snapshot, keeping the Trends history clean.

If generated data is missing or stale, use the existing CSV upload fallback.
```

- [ ] **Step 2: Run all automated tests**

Run:

`node scripts/test-tmi-area20.mjs`

Expected: `tmi-area20 parser tests passed`.

Run the headless `tests.html` one-liner from Task 2 Step 3.

Expected: all assertions pass.

- [ ] **Step 3: Try live generation when network is available**

Run:

`node scripts/update-tmi-area20.mjs /tmp/tmi-area20.json`

Expected if network is available: file writes with 5 clubs. Inspect:

`node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('/tmp/tmi-area20.json','utf8')); console.log(d.source); console.log(d.clubs.map(c=>c.clubNumber+': '+c.clubName).join('\\n'))"`

Expected club numbers include `3378`, `4875`, `9448`, `9627`, `28679342`.

If local network is blocked, do not fail the implementation; the fixture test and GitHub Action cover the parser contract.

- [ ] **Step 4: Optional browser verification**

Serve the app:

`python3 -m http.server 8642`

Open `http://localhost:8642/tests.html`; expected green summary.

Open `http://localhost:8642/index.html#tmi`; if `data/tmi-area20.json` exists, click Refresh from TMI, confirm preview, and verify the Toast says today's snapshot was saved. Then open `#leaderboard` and expand a club; verify Progress appears. Open `#trends`; verify Club progress appears.

- [ ] **Step 5: Commit Task 5**

Commit:

```bash
git add README.md data/tmi-area20.json
git commit -m "docs: document automated TMI refresh"
```

If `data/tmi-area20.json` was not generated locally, commit only README:

```bash
git add README.md
git commit -m "docs: document automated TMI refresh"
```

---

## Self-Review Notes

- Spec coverage: Task 1 covers GitHub Action and generated JSON; Task 2 covers data validation/mapping and progress helpers; Task 3 covers refresh order and auto-snapshot after confirmed imports; Task 4 covers both leaderboard and Trends progress views; Task 5 covers docs and verification.
- No new backend, database, framework, or npm dependency is introduced.
- Generated data updates matching app clubs only; unmatched generated clubs and missing app clubs are reported in the preview.
- Snapshots remain same-date replace and cap at 60 through the existing `saveSnapshot` function.
