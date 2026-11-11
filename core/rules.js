// Points each warning sign adds to the score
const WEIGHTS = {
  riskyType: 25,
  doubleExtension: 35,
  lookalike: 30,
  shortener: 10,
  noHttps: 10,
};

// File types that deserve a second look
const RISKY_EXTENSIONS = ["exe", "msi", "scr", "bat", "js", "jar", "zip"];
const DECOY_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "txt"];
const SHORTENER_HOSTS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"];

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
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

console.log(checkNoHttps("http://free-games.example"));
console.log(checkNoHttps("https://zoom.us/download"));
console.log(checkShortener("https://bit.ly/abc123"));
console.log(checkShortener("https://imgur.com/abc"));