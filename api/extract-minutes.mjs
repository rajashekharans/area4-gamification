import {
  extractMinutesWithAI,
  extractTextFromFile,
  mergeRequestFallbacks,
  validateRequestParts
} from "./minutes-extraction-core.mjs";

export const config = {
  api: {
    bodyParser: false
  }
};

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function parseContentDisposition(value) {
  const out = {};
  String(value || "").split(";").forEach((part) => {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) return;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    out[key] = raw.replace(/^"|"$/g, "");
  });
  return out;
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || "");
  if (!boundaryMatch) throw new Error("Missing multipart boundary.");
  const boundary = "--" + boundaryMatch[1].replace(/^"|"$/g, "");
  const body = buffer.toString("latin1");
  const parts = body.split(boundary).slice(1, -1);
  const fields = {};
  let file = null;

  parts.forEach((part) => {
    let value = part;
    if (value.startsWith("\r\n")) value = value.slice(2);
    if (value.endsWith("\r\n")) value = value.slice(0, -2);
    const headerEnd = value.indexOf("\r\n\r\n");
    if (headerEnd < 0) return;
    const headerText = value.slice(0, headerEnd);
    const content = value.slice(headerEnd + 4);
    const headers = {};
    headerText.split("\r\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx < 0) return;
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });
    const disposition = parseContentDisposition(headers["content-disposition"]);
    if (!disposition.name) return;
    const contentBuffer = Buffer.from(content, "latin1");
    if (disposition.filename) {
      file = {
        filename: disposition.filename,
        contentType: headers["content-type"] || "application/octet-stream",
        buffer: contentBuffer
      };
    } else {
      fields[disposition.name] = contentBuffer.toString("utf8");
    }
  });

  return { fields, file };
}

function inputTypeFor(file, hasText) {
  if (!file) return hasText ? "text" : "unknown";
  const filename = String(file.filename || "").toLowerCase();
  if (filename.endsWith(".docx")) return "docx";
  if (filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".txt")) return "txt";
  return "file";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST to extract minutes." });
    return;
  }

  try {
    const body = await readBody(req);
    const { fields, file } = parseMultipart(body, req.headers["content-type"]);
    const requestParts = mergeRequestFallbacks({
      clubId: fields.clubId,
      clubName: fields.clubName,
      text: fields.text,
      meetingDate: fields.meetingDate,
      file
    }, req.headers);
    const validation = validateRequestParts(requestParts);
    if (!validation.ok) {
      sendJson(res, validation.status, { ok: false, error: validation.error });
      return;
    }

    let fileText = "";
    if (file) {
      try {
        fileText = await extractTextFromFile(file);
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message });
        return;
      }
    }

    const text = [fields.text, fileText].map((v) => String(v || "").trim()).filter(Boolean).join("\n\n");
    const result = await extractMinutesWithAI({
      clubId: requestParts.clubId,
      clubName: requestParts.clubName,
      meetingDate: requestParts.meetingDate,
      inputType: inputTypeFor(file, fields.text),
      text
    });
    sendJson(res, result.ok ? 200 : 400, result);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message || "Could not extract minutes."
    });
  }
}
