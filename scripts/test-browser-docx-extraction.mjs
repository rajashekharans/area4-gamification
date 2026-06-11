import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";

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

const html = await readFile("index.html", "utf8");
const coreMatch = html.match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/);
assert.ok(coreMatch, "CORE region markers not found in index.html");

const stubWindow = {};
new Function("window", '"use strict";' + coreMatch[1])(stubWindow);

const docx = makeZip([
  {
    name: "word/document.xml",
    content: '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Visitors: Narmada, Mani, Bhavik</w:t></w:r></w:p></w:body></w:document>'
  }
]);

const text = await stubWindow.A4.extractDocxTextFromArrayBuffer(
  docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.byteLength)
);

assert.equal(text, "Visitors: Narmada, Mani, Bhavik");

console.log("browser DOCX extraction tests passed");
