// Points each warning sign adds to the score
export const WEIGHTS = {
  riskyType: 25,
  archive: 15,
  doubleExtension: 35,
  lookalike: 30,
  shortener: 10,
  noHttps: 10,
  // used by filescan.js
  disguisedProgram: 60,
  typeMismatch: 20,
  pdfFeatures: 25,
  scriptPatterns: 20,
};

const PROGRAM_EXTENSIONS = ["exe", "msi", "scr", "bat", "cmd", "js", "vbs", "ps1", "jar"];
const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z"];
const DECOY_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "txt"];
const SHORTENER_HOSTS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];

// Well-known brands and their one real website
const BRANDS = [
  { name: "zoom", domain: "zoom.us" },
  { name: "paypal", domain: "paypal.com" },
  { name: "microsoft", domain: "microsoft.com" },
  { name: "google", domain: "google.com" },
  { name: "apple", domain: "apple.com" },
  { name: "amazon", domain: "amazon.com" },
];

// "README" has no dot, so it has no extension
export function getExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

// The real owner of an address is its last two pieces
function getRegistrableDomain(host) {
  return host.split(".").slice(-2).join(".");
}

// Returns the parsed link, or null if it isn't a valid link
function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function checkRiskyType(fileName) {
  const ext = getExtension(fileName);
  if (PROGRAM_EXTENSIONS.includes(ext)) {
    return {
      points: WEIGHTS.riskyType,
      reason: `This is a program or script file (.${ext}), which can run code on your computer if you open it.`,
    };
  }
  if (ARCHIVE_EXTENSIONS.includes(ext)) {
    return {
      points: WEIGHTS.archive,
      reason: `This is a compressed archive (.${ext}). Archives can hide other files, so check what's inside before opening anything.`,
    };
  }
  return null;
}

export function checkDoubleExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  const risky = [...PROGRAM_EXTENSIONS, ...ARCHIVE_EXTENSIONS];

  if (parts.length >= 3 && DECOY_EXTENSIONS.includes(secondLast) && risky.includes(last)) {
    return {
      points: WEIGHTS.doubleExtension,
      reason: `This file's name makes it look like a .${secondLast} file, but it is really a .${last} file.`,
    };
  }
  return null;
}

export function checkNoHttps(url) {
  const parsed = parseUrl(url);
  if (parsed && parsed.protocol === "http:") {
    return {
      points: WEIGHTS.noHttps,
      reason: `This link is not secure (http), so the file could be changed on its way to your computer.`,
    };
  }
  return null;
}

export function checkShortener(url) {
  const parsed = parseUrl(url);
  if (parsed && SHORTENER_HOSTS.includes(parsed.hostname)) {
    return {
      points: WEIGHTS.shortener,
      reason: `This link uses a link shortener (${parsed.hostname}), which hides where the download really comes from.`,
    };
  }
  return null;
}

// Trick 1: a brand name on a website that isn't the brand's real one
export function checkBrandOnWrongDomain(url) {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const owner = getRegistrableDomain(parsed.hostname);
  for (const brand of BRANDS) {
    if (owner.includes(brand.name) && owner !== brand.domain) {
      return {
        points: WEIGHTS.lookalike,
        reason: `This site's name contains "${brand.name}", but it is not the official ${brand.domain}.`,
      };
    }
  }
  return null;
}

// Trick 2: a real brand address stuffed in front of someone else's site
export function checkFakeSubdomain(url) {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname;
  const owner = getRegistrableDomain(host);
  for (const brand of BRANDS) {
    if (host.includes(brand.domain) && owner !== brand.domain) {
      return {
        points: WEIGHTS.lookalike,
        reason: `This link includes ${brand.domain} to look official, but it really belongs to ${owner}.`,
      };
    }
  }
  return null;
}
