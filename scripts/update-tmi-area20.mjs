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
