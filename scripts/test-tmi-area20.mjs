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
