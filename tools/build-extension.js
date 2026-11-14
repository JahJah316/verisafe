// Chrome can only load files inside the extension folder, so the shared engine
// in core/ is copied into extension/lib/ before loading or zipping the
// extension. The popup's colours are generated from the site's stylesheet in
// the same step, so the palette is never hand-copied in two places.
//
//   npm run build:extension
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { writeIcons } from "./make-icons.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const ENGINE_FILES = ["rules.js", "analyze.js", "filescan.js"];
const DARK_MEDIA = "@media (prefers-color-scheme: dark)";

// The rule that starts at `start`, up to its matching closing brace.
function blockAt(css, start, label) {
  const open = css.indexOf("{", start);
  if (open === -1) throw new Error(`${label}: no opening brace found`);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`${label}: unbalanced braces`);
}

// The light and dark palettes, taken verbatim from website/style.css.
async function readSiteTokens() {
  const css = await readFile(join(root, "website", "style.css"), "utf8");

  const darkStart = css.indexOf(DARK_MEDIA);
  if (darkStart === -1) throw new Error(`website/style.css: no "${DARK_MEDIA}" block`);

  const lightStart = css.indexOf(":root");
  if (lightStart === -1 || lightStart > darkStart) {
    throw new Error("website/style.css: no light :root block before the dark block");
  }

  const light = blockAt(css, lightStart, ":root");
  const dark = blockAt(css, darkStart, DARK_MEDIA);

  for (const [name, block] of [["light", light], ["dark", dark]]) {
    if (!block.includes("--high-text")) {
      throw new Error(`website/style.css: ${name} palette is missing --high-text`);
    }
  }

  return { light, dark };
}

const libDir = join(root, "extension", "lib");
await mkdir(libDir, { recursive: true });

for (const file of ENGINE_FILES) {
  const source = await readFile(join(root, "core", file), "utf8");
  const banner = `// Generated from core/${file} by tools/build-extension.js. Do not edit this copy.\n\n`;
  await writeFile(join(libDir, file), banner + source);
}

const tokens = await readSiteTokens();
const tokensCss = [
  "/* Generated from website/style.css by tools/build-extension.js.",
  "   Do not edit: change the site's palette and re-run build:extension. */",
  "",
  tokens.light,
  "",
  tokens.dark,
  "",
].join("\n");
await writeFile(join(root, "extension", "tokens.css"), tokensCss);

// Fail loudly if the popup asks for a colour the site no longer defines.
const popupCss = await readFile(join(root, "extension", "popup.css"), "utf8");
const used = new Set([...popupCss.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]));
const defined = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
const missing = [...used].filter((name) => !defined.has(name));
if (missing.length > 0) {
  throw new Error(`popup.css uses colours website/style.css does not define: ${missing.join(", ")}`);
}

await writeIcons(join(root, "extension", "icons"));

console.log(
  `extension/lib: ${ENGINE_FILES.join(", ")}\n` +
  `extension/tokens.css: ${defined.size} site colours, ${used.size} used by popup.css, ${missing.length} missing\n` +
  "extension/icons: 16, 32, 48, 128"
);
