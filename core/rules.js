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

function getExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

function checkRiskyType(fileName) {
  const ext = getExtension(fileName);
  // TODO: if RISKY_EXTENSIONS includes ext, return
  // { points: WEIGHTS.riskyType, reason: "..." }
  // otherwise return null
}

console.log(getExtension("Zoom_Installer.pdf.exe"));
console.log(getExtension("SETUP.EXE"));