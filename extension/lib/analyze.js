// Generated from core/analyze.js by tools/build-extension.js. Do not edit this copy.

import {
  checkRiskyType,
  checkDoubleExtension,
  checkNoHttps,
  checkShortener,
  checkBrandOnWrongDomain,
  checkFakeSubdomain,
} from "./rules.js";
import { checkDisguisedContent, checkPdfFeatures, checkScriptPatterns } from "./filescan.js";

const ACTIONS = {
  low: "This doesn't guarantee the file is safe, so stay careful with anything you didn't expect.",
  medium: "Be careful. Only open this if you trust where it came from.",
  high: "Don't open this file unless you are sure it's legitimate.",
};

// Chrome gives a full path like C:\Users\me\Downloads\file.exe, so keep only the name
function cleanFileName(fileName) {
  return fileName.split(/[\\/]/).pop();
}

export function getLevel(score) {
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}

// bytes is optional: only the website can supply it
export function analyze(fileName, url, bytes) {
  const name = cleanFileName(fileName);

  const findings = [
    checkRiskyType(name),
    checkDoubleExtension(name),
    checkNoHttps(url),
    checkShortener(url),
    checkBrandOnWrongDomain(url),
    checkFakeSubdomain(url),
  ];

  if (bytes) {
    findings.push(
      checkDisguisedContent(name, bytes),
      checkPdfFeatures(bytes),
      checkScriptPatterns(name, bytes)
    );
  }

  const hits = findings.filter((finding) => finding !== null);
  const score = hits.reduce((total, finding) => total + finding.points, 0);
  const level = getLevel(score);

  return {
    level,
    score,
    reasons: hits.map((finding) => finding.reason),
    recommendedAction: ACTIONS[level],
  };
}
