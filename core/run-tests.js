import { readFileSync } from "node:fs";
import { analyze } from "./analyze.js";

const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));
const expected = JSON.parse(readFileSync(new URL("./expected-verdicts.json", import.meta.url), "utf8"));

let passed = 0;
for (const c of cases) {
  const result = analyze(c.fileName, c.url);
  const want = expected[String(c.id)];
  const ok = result.level === want;
  if (ok) passed++;
  console.log(`${ok ? "PASS" : "FAIL"}  #${c.id} ${c.fileName}  got ${result.level} (${result.score}), expected ${want}`);
}

console.log(`\n${passed}/${cases.length} passed`);
if (passed !== cases.length) process.exit(1);
