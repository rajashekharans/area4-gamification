import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { deflateRawSync } from "node:zlib";
import handler from "../api/extract-minutes.mjs";
import {
  buildGatewayRequestBody,
  checkSelectedClubMatchesMinutes,
  countMembersPresent,
  extractMinutesWithAI,
  extractTextFromFile,
  inferAttendancePct,
  mergeRequestFallbacks,
  parseGatewayContent,
  validateRequestParts
} from "../api/minutes-extraction-core.mjs";

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = Buffer.from(entry.name, "utf8");
    const original = Buffer.from(entry.content, "utf8");
    const compressed = deflateRawSync(original);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(8), u16(0), u16(0), u32(0),
      u32(compressed.length), u32(original.length), u16(name.length), u16(0),
      name, compressed
    ]);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(8), u16(0), u16(0), u32(0),
      u32(compressed.length), u32(original.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  });

  const centralDir = Buffer.concat(centrals);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralDir.length), u32(offset), u16(0)
  ]);
  return Buffer.concat([...locals, centralDir, end]);
}

const generated = await extractMinutesWithAI({
  clubId: "marsden-park",
  clubName: "Marsden Park Toastmasters",
  meetingDate: "2026-06-11",
  inputType: "text",
  activeMembers: 4,
  text: "Members present were: Jane Smith, Alex Lee. Guests: Jane Smith and Alex Lee. Raj visited Blacktown City.",
  generate: async ({ source, text }) => {
    assert.equal(source.clubId, "marsden-park");
    assert.ok(text.includes("Jane Smith"));
    return {
      attendancePct: 67,
      meetings: 1,
      guests: { count: 2, names: ["Jane Smith", "Alex Lee"] },
      visitorsBecameMembers: ["Jane Smith"],
      memberVisits: [{ memberName: "Raj Naidu", visitedClubName: "Blacktown City Toastmasters" }],
      awards: [{ level: "area", name: "Area Evaluation Contest", recipientName: "Jane Smith" }],
      eventParticipation: [{ level: "district", name: "District Training", participantName: "Alex Lee" }],
      confidence: { overall: "medium", needsReview: ["Review Alex Lee membership status."] }
    };
  }
});

assert.deepEqual(generated, {
  ok: true,
  source: {
    clubId: "marsden-park",
    clubName: "Marsden Park Toastmasters",
    meetingDate: "2026-06-11",
    inputType: "text"
  },
  extracted: {
    attendancePct: 50,
    meetings: 1,
    guests: { count: 2, names: ["Jane Smith", "Alex Lee"] },
    visitorsBecameMembers: ["Jane Smith"],
    memberVisits: [{ memberName: "Raj Naidu", visitedClubName: "Blacktown City Toastmasters" }],
    awards: [{ level: "area", name: "Area Evaluation Contest", recipientName: "Jane Smith" }],
    eventParticipation: [{ level: "district", name: "District Training", participantName: "Alex Lee" }]
  },
  confidence: { overall: "medium", needsReview: ["Review Alex Lee membership status."] }
});

assert.deepEqual(validateRequestParts({ clubId: "", clubName: "Marsden", text: "Guests attended" }), {
  ok: false,
  status: 400,
  error: "Choose a club before extracting minutes."
});

assert.deepEqual(
  validateRequestParts({ clubId: "marsden-park", clubName: "Marsden Park Toastmasters", text: "" }),
  { ok: false, status: 400, error: "Paste minutes text or upload a minutes file." }
);

assert.deepEqual(
  mergeRequestFallbacks(
    { clubId: "", clubName: "", meetingDate: "", text: "Guests attended" },
    {
      "x-area4-club-id": "quakers-hill",
      "x-area4-club-name": "Quakers Hill Toastmasters",
      "x-area4-meeting-date": "2026-06-11"
    }
  ),
  {
    clubId: "quakers-hill",
    clubName: "Quakers Hill Toastmasters",
    meetingDate: "2026-06-11",
    text: "Guests attended"
  }
);

const gatewayBody = buildGatewayRequestBody({
  source: {
    clubId: "quakers-hill",
    clubName: "Quakers Hill Toastmasters",
    meetingDate: "2026-06-11",
    inputType: "text"
  },
  text: "Visitors: Narmada, Mani, Bhavik",
  model: "openai/gpt-5.4"
});
assert.equal(gatewayBody.model, "openai/gpt-5.4");
assert.equal("response_format" in gatewayBody, false);
assert.equal(gatewayBody.messages[0].role, "system");
assert.ok(gatewayBody.messages[1].content.includes("Return JSON only"));

assert.deepEqual(
  parseGatewayContent('Here is the JSON:\n{"guests":{"count":3,"names":["Narmada","Mani","Bhavik"]},"confidence":{"overall":"high","needsReview":[]}}'),
  {
    guests: { count: 3, names: ["Narmada", "Mani", "Bhavik"] },
    confidence: { overall: "high", needsReview: [] }
  }
);

assert.deepEqual(
  checkSelectedClubMatchesMinutes({
    selectedClubName: "Quakers Hill Toastmasters",
    text: "Minutes of Quakers Hill Toastmasters Club Regular Meeting #726"
  }),
  { ok: true }
);

assert.deepEqual(
  checkSelectedClubMatchesMinutes({
    selectedClubName: "Marsden Park Toastmasters",
    text: "Minutes of Quakers Hill Toastmasters Club Regular Meeting #726"
  }),
  {
    ok: false,
    error: "The uploaded minutes look like Quakers Hill Toastmasters Club, but Marsden Park Toastmasters is selected."
  }
);

assert.deepEqual(
  checkSelectedClubMatchesMinutes({
    selectedClubName: "Marsden Park Toastmasters",
    text: "Visitors: Narmada, Mani, Bhavik"
  }),
  { ok: true }
);

const sampleAttendanceText = [
  "Members present were: Maziar Bijari, Jimmy Boghdadi, Pradeep Borah, Raymond Buttigieg, Leonardo Canao",
  "Members apology: Navid Baradaran, Manuja Dayananda",
  "Visitors: Narmada, Mani, Bhavik"
].join(" ");

assert.equal(countMembersPresent(sampleAttendanceText), 5);
assert.equal(inferAttendancePct({ text: sampleAttendanceText, activeMembers: 10 }), 50);
assert.equal(inferAttendancePct({ text: sampleAttendanceText, activeMembers: 4 }), 100);
assert.equal(inferAttendancePct({ text: "Visitors: Narmada, Mani", activeMembers: 10 }), null);

{
  const previousGatewayKey = process.env.AI_GATEWAY_API_KEY;
  const previousOidc = process.env.VERCEL_OIDC_TOKEN;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  const req = Readable.from([]);
  req.method = "POST";
  req.headers = { "content-type": "application/json" };
  req.body = {
    clubId: "marsden-park",
    clubName: "Marsden Park Toastmasters",
    meetingDate: "2026-06-11",
    text: "Visitors: Narmada, Mani, Bhavik, Seerisha, Amit"
  };
  const chunks = [];
  const res = {
    statusCode: 0,
    setHeader() {},
    end(value) { chunks.push(String(value)); }
  };
  await handler(req, res);
  assert.equal(res.statusCode, 500);
  assert.equal(JSON.parse(chunks.join("")).error, "AI Gateway is not configured. Set AI_GATEWAY_API_KEY in Vercel.");
  if (previousGatewayKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
  else process.env.AI_GATEWAY_API_KEY = previousGatewayKey;
  if (previousOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = previousOidc;
}

assert.equal(
  await extractTextFromFile({
    filename: "minutes.txt",
    contentType: "text/plain",
    buffer: Buffer.from("Guests: Jane Smith", "utf8")
  }),
  "Guests: Jane Smith"
);

const docxBuffer = makeZip([
  {
    name: "[Content_Types].xml",
    content: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  },
  {
    name: "_rels/.rels",
    content: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  },
  {
    name: "word/document.xml",
    content: '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Visitor Jane Smith attended.</w:t></w:r></w:p></w:body></w:document>'
  }
]);

assert.equal(
  (await extractTextFromFile({
    filename: "minutes.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: docxBuffer
  })).trim(),
  "Visitor Jane Smith attended."
);

await assert.rejects(
  () => extractTextFromFile({
    filename: "minutes.png",
    contentType: "image/png",
    buffer: Buffer.from("not minutes")
  }),
  /Unsupported file type/
);

console.log("minutes extraction API tests passed");
