// Generated from core/filescan.js by tools/build-extension.js. Do not edit this copy.

import { getExtension, WEIGHTS } from "./rules.js";

// Does the file start with these exact bytes?
function startsWith(bytes, signature) {
  return signature.every((value, i) => bytes[i] === value);
}

// Work out what a file REALLY is from its first bytes
export function detectKind(bytes) {
  if (startsWith(bytes, [0x4d, 0x5a])) return "program"; // "MZ" = Windows program
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "pdf"; // "%PDF"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // zip, docx, xlsx, pptx
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) return "ole"; // old doc, xls
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  return "unknown";
}

// What each extension should look like inside
const EXPECTED_KINDS = {
  pdf: ["pdf"],
  png: ["png"],
  jpg: ["jpeg"],
  jpeg: ["jpeg"],
  docx: ["zip"],
  xlsx: ["zip"],
  pptx: ["zip"],
  doc: ["ole"],
  xls: ["ole"],
  zip: ["zip"],
};

function bytesToText(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

// Layer 2: does the name match what is really inside?
export function checkDisguisedContent(fileName, bytes) {
  const ext = getExtension(fileName);
  const expected = EXPECTED_KINDS[ext];
  if (!expected) return null;

  const actual = detectKind(bytes);
  if (actual === "program") {
    return {
      points: WEIGHTS.disguisedProgram,
      reason: `The name says .${ext}, but the contents are a Windows program. This file is not what it claims to be.`,
    };
  }
  if (actual !== "unknown" && !expected.includes(actual)) {
    return {
      points: WEIGHTS.typeMismatch,
      reason: `The name says .${ext}, but the contents look like a different kind of file (${actual}).`,
    };
  }
  return null;
}

// Layer 5: PDFs that can run code or open other files
const PDF_FLAGS = ["/JavaScript", "/OpenAction", "/Launch", "/EmbeddedFile"];

export function checkPdfFeatures(bytes) {
  if (detectKind(bytes) !== "pdf") return null;
  const text = bytesToText(bytes);
  const found = PDF_FLAGS.filter((flag) => text.includes(flag));
  if (found.length === 0) return null;
  return {
    points: WEIGHTS.pdfFeatures,
    reason: `This PDF contains features that can run code or open other files (${found.join(", ")}).`,
  };
}

// Layer 5: scripts that hide what they do
const SCRIPT_EXTENSIONS = ["js", "ps1", "bat", "cmd", "vbs"];
const SCRIPT_PATTERNS = ["-encodedcommand", " -enc ", "frombase64string", "eval(", "wscript.shell", "invoke-expression"];

export function checkScriptPatterns(fileName, bytes) {
  if (!SCRIPT_EXTENSIONS.includes(getExtension(fileName))) return null;
  const text = bytesToText(bytes).toLowerCase();
  const found = SCRIPT_PATTERNS.filter((pattern) => text.includes(pattern));
  if (found.length === 0) return null;
  return {
    points: WEIGHTS.scriptPatterns,
    reason: `This script contains patterns often used to hide what it does (${found.join(", ").trim()}).`,
  };
}
