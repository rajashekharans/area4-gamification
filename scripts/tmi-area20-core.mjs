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
  if (!Number.isInteger(n)) {
    throw new Error(`Expected integer for ${label}, got ${JSON.stringify(value)}`);
  }
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
