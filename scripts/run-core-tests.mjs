import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const [indexHtml, testsHtml] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("tests.html", "utf8")
]);

const coreMatch = indexHtml.match(/\/\/ === CORE ===([\s\S]*?)\/\/ === UI ===/);
const casesMatch = testsHtml.match(/\/\/ === CASES ===([\s\S]*?)\/\/ === END CASES ===/);

assert.ok(coreMatch, "CORE region markers not found in index.html");
assert.ok(casesMatch, "CASES region markers not found in tests.html");

const stubWindow = {};
new Function("window", '"use strict";' + coreMatch[1])(stubWindow);
new Function(casesMatch[1] + "\nreturn runCases;")()(stubWindow.A4, (name, actual, expected) => {
  assert.deepEqual(actual, expected, name);
});

console.log("core browser tests passed");
