// Points each warning sign adds to the score
const WEIGHTS = {
  riskyType: 25,
  doubleExtension: 35,
  lookalike: 30,
  shortener: 10,
  noHttps: 10,
};

const RISKY_EXTENSIONS = ["exe", "msi", "scr", "bat", "js", "jar", "zip"];
const DECOY_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "txt"];
const SHORTENER_HOSTS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];
const BRANDS = [
  { name: "zoom", domain: "zoom.us" },
  { name: "paypal", domain: "paypal.com" },
  { name: "microsoft", domain: "microsoft.com" },
  { name: "google", domain: "google.com" },
  { name: "apple", domain: "apple.com" },
  { name: "amazon", domain: "amazon.com" },
];

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

// The real owner of an address is its last two pieces
function getRegistrableDomain(host) {
  return host.split(".").slice(-2).join(".");
}

function checkRiskyType(fileName) {
  const ext = getExtension(fileName);
  if (RISKY_EXTENSIONS.includes(ext)) {
    return {
      points: WEIGHTS.riskyType,
      reason: `This is a program or script file (.${ext}), which can run code on your computer if you open it.`,
    };
  }
  return null;
}

function checkDoubleExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  if (parts.length >= 3 && DECOY_EXTENSIONS.includes(secondLast) && RISKY_EXTENSIONS.includes(last)) {
    return {
      points: WEIGHTS.doubleExtension,
      reason: `This file's name makes it look like a .${secondLast} file, but it is really a .${last} file.`,
    };
  }
  return null;
}

function checkNoHttps(url) {
  const protocol = new URL(url).protocol;
  if (protocol === "http:") {
    return {
      points: WEIGHTS.noHttps,
      reason: `This link is not secure (http), so the file could be changed on its way to your computer.`,
    };
  }
  return null;
}

function checkShortener(url) {
  const host = new URL(url).hostname;
  if (SHORTENER_HOSTS.includes(host)) {
    return {
      points: WEIGHTS.shortener,
      reason: `This link uses a link shortener (${host}), which hides where the download really comes from.`,
    };
  }
  return null;
}

// Trick 1: a brand name on a website that isn't the brand's real one
function checkBrandOnWrongDomain(url) {
  const host = new URL(url).hostname;
  const owner = getRegistrableDomain(host);
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
function checkFakeSubdomain(url) {
  const host = new URL(url).hostname;
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

console.log(checkBrandOnWrongDomain("http://zoom-download.co/Zoom_Installer.pdf.exe")); // object
console.log(checkBrandOnWrongDomain("https://zoom.us/download"));                       // null
console.log(checkFakeSubdomain("https://zoom.us.verify-login.example/notes"));          // object
console.log(checkFakeSubdomain("https://support.zoom.us/help"));                        // null