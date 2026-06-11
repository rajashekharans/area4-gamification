import { inflateRawSync } from "node:zlib";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MODEL = "openai/gpt-5.4";
export const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

function cleanText(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function cleanName(value) {
  return cleanText(value).replace(/\s+/g, " ");
}

function asNumber(value, fallback = null) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeLevel(value) {
  const level = cleanText(value).toLowerCase();
  return ["area", "division", "district"].includes(level) ? level : "";
}

function uniqueNames(names) {
  const seen = new Set();
  const out = [];
  asArray(names).forEach((name) => {
    const cleaned = cleanName(name);
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      out.push(cleaned);
    }
  });
  return out;
}

export function validateRequestParts(parts) {
  if (!cleanText(parts?.clubId)) {
    return { ok: false, status: 400, error: "Choose a club before extracting minutes." };
  }
  if (!cleanText(parts?.clubName)) {
    return { ok: false, status: 400, error: "Choose a club before extracting minutes." };
  }
  if (!cleanText(parts?.text) && !parts?.file) {
    return { ok: false, status: 400, error: "Paste minutes text or upload a minutes file." };
  }
  if (parts?.file?.buffer && parts.file.buffer.length > MAX_FILE_BYTES) {
    return { ok: false, status: 413, error: "File is too large. Upload a file under 10 MB." };
  }
  return { ok: true };
}

export function mergeRequestFallbacks(parts, headers = {}) {
  const readHeader = (name) => {
    if (typeof headers.get === "function") return headers.get(name) || "";
    return headers[name] || headers[name.toLowerCase()] || "";
  };
  return {
    ...parts,
    clubId: cleanText(parts?.clubId) || cleanText(readHeader("x-area4-club-id")),
    clubName: cleanText(parts?.clubName) || cleanText(readHeader("x-area4-club-name")),
    meetingDate: cleanText(parts?.meetingDate) || cleanText(readHeader("x-area4-meeting-date"))
  };
}

function decodeXmlEntities(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readZipEntry(buffer, wantedName) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Could not read DOCX file.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let ptr = buffer.readUInt32LE(eocd + 16);

  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(ptr) !== 0x02014b50) throw new Error("Could not read DOCX file.");
    const method = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const fileNameLength = buffer.readUInt16LE(ptr + 28);
    const extraLength = buffer.readUInt16LE(ptr + 30);
    const commentLength = buffer.readUInt16LE(ptr + 32);
    const localOffset = buffer.readUInt32LE(ptr + 42);
    const name = buffer.subarray(ptr + 46, ptr + 46 + fileNameLength).toString("utf8");

    if (name === wantedName) {
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Could not read DOCX file.");
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error("Unsupported DOCX compression.");
    }

    ptr += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("Could not find DOCX document text.");
}

function extractDocxText(buffer) {
  const xml = readZipEntry(buffer, "word/document.xml").toString("utf8");
  const chunks = [];
  const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = re.exec(xml))) chunks.push(decodeXmlEntities(match[1]));
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

function unescapePdfString(value) {
  return String(value)
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfText(buffer) {
  if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("Unsupported PDF file.");
  }
  const bodies = [];
  const raw = buffer.toString("latin1");
  const streamRe = /<<(?:.|\n|\r)*?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;
  while ((streamMatch = streamRe.exec(raw))) {
    const headerStart = raw.lastIndexOf("<<", streamMatch.index);
    const header = raw.slice(headerStart, streamMatch.index);
    const data = Buffer.from(streamMatch[1], "latin1");
    if (/\/FlateDecode/.test(header)) {
      try {
        bodies.push(inflateRawSync(data).toString("latin1"));
      } catch {
        bodies.push("");
      }
    } else {
      bodies.push(streamMatch[1]);
    }
  }
  bodies.push(raw);

  const text = bodies.join("\n");
  const chunks = [];
  const stringRe = /\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/g;
  let match;
  while ((match = stringRe.exec(text))) {
    const segment = match[0];
    const parenRe = /\((?:\\.|[^\\)])*\)/g;
    let p;
    while ((p = parenRe.exec(segment))) {
      chunks.push(unescapePdfString(p[0].slice(1, -1)));
    }
  }
  const out = chunks.join(" ").replace(/\s+/g, " ").trim();
  if (!out) throw new Error("Could not extract text from that PDF. Try exporting the minutes as text or DOCX.");
  return out;
}

export async function extractTextFromFile(file) {
  const filename = cleanText(file?.filename).toLowerCase();
  const contentType = cleanText(file?.contentType).toLowerCase();
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer)) throw new Error("Could not read uploaded file.");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("File is too large. Upload a file under 10 MB.");

  if (filename.endsWith(".txt") || contentType.startsWith("text/")) {
    return buffer.toString("utf8").trim();
  }
  if (filename.endsWith(".docx") || contentType.includes("wordprocessingml.document")) {
    return extractDocxText(buffer);
  }
  if (filename.endsWith(".pdf") || contentType === "application/pdf") {
    return extractPdfText(buffer);
  }
  throw new Error("Unsupported file type. Upload TXT, DOCX, or a selectable-text PDF.");
}

export function normalizeExtraction(raw) {
  const source = raw && raw.extracted ? raw.extracted : raw || {};
  const guests = source.guests && typeof source.guests === "object" ? source.guests : {};
  return {
    attendancePct: asNumber(source.attendancePct),
    meetings: asNumber(source.meetings),
    guests: {
      count: asNumber(guests.count, uniqueNames(guests.names).length),
      names: uniqueNames(guests.names)
    },
    visitorsBecameMembers: uniqueNames(source.visitorsBecameMembers),
    memberVisits: asArray(source.memberVisits).map((visit) => ({
      memberName: cleanName(visit?.memberName),
      visitedClubName: cleanText(visit?.visitedClubName)
    })).filter((visit) => visit.memberName && visit.visitedClubName),
    awards: asArray(source.awards).map((award) => ({
      level: normalizeLevel(award?.level),
      name: cleanText(award?.name),
      recipientName: cleanName(award?.recipientName)
    })).filter((award) => award.level && award.name),
    eventParticipation: asArray(source.eventParticipation).map((event) => ({
      level: normalizeLevel(event?.level),
      name: cleanText(event?.name),
      participantName: cleanName(event?.participantName)
    })).filter((event) => event.level && event.name)
  };
}

function normalizeConfidence(raw) {
  const confidence = raw?.confidence || {};
  const overall = ["low", "medium", "high"].includes(confidence.overall) ? confidence.overall : "medium";
  return {
    overall,
    needsReview: asArray(confidence.needsReview).map(cleanText).filter(Boolean)
  };
}

function buildPrompt({ source, text }) {
  return [
    "Extract Toastmasters club meeting engagement data from these minutes.",
    "Return JSON only. Do not include markdown, explanation, or code fences.",
    "Use these keys: attendancePct, meetings, guests { count, names }, visitorsBecameMembers, memberVisits, awards, eventParticipation, confidence { overall, needsReview }.",
    "Only include Area, Division, or District awards/events. Keep club visitors separate from club members visiting other clubs.",
    "Names must match the minutes text where possible. If uncertain, add a needsReview note.",
    `Club: ${source.clubName}`,
    `Meeting date: ${source.meetingDate || "unknown"}`,
    "",
    text
  ].join("\n");
}

export function buildGatewayRequestBody({ source, text, model = DEFAULT_MODEL }) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You extract structured JSON from Toastmasters minutes. Return JSON only."
      },
      { role: "user", content: buildPrompt({ source, text }) }
    ]
  };
}

export function parseGatewayContent(content) {
  const raw = cleanText(content);
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("AI Gateway returned non-JSON extraction content.");
  }
}

function gatewayErrorText(status, bodyText) {
  let message = cleanText(bodyText);
  try {
    const parsed = JSON.parse(message);
    message = parsed?.error?.message || parsed?.message || JSON.stringify(parsed);
  } catch {
    // Preserve plain-text provider errors.
  }
  return `AI Gateway request failed with status ${status}${message ? `: ${message}` : "."}`;
}

async function callGateway({ source, text }) {
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error("AI Gateway is not configured. Set AI_GATEWAY_API_KEY in Vercel.");
  }
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildGatewayRequestBody({
      source,
      text,
      model: process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL
    }))
  });

  if (!response.ok) {
    throw new Error(gatewayErrorText(response.status, await response.text()));
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI Gateway returned no extraction content.");
  return parseGatewayContent(content);
}

export async function extractMinutesWithAI({ clubId, clubName, meetingDate, inputType, text, generate = callGateway }) {
  const source = {
    clubId: cleanText(clubId),
    clubName: cleanText(clubName),
    meetingDate: cleanText(meetingDate),
    inputType: cleanText(inputType || "text")
  };
  const minutesText = cleanText(text);
  if (minutesText.length < 10) {
    return { ok: false, error: "Could not extract enough text from the minutes." };
  }
  const raw = await generate({ source, text: minutesText });
  return {
    ok: true,
    source,
    extracted: normalizeExtraction(raw),
    confidence: normalizeConfidence(raw)
  };
}
