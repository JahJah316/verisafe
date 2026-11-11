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

console.log(checkRiskyType("Zoom_Installer.exe"));
console.log(checkRiskyType("Resume_Template.pdf"));
console.log(checkDoubleExtension("Invoice_2026.pdf.js"));
console.log(checkDoubleExtension("Zoom_Installer.exe"));
console.log(checkDoubleExtension("Resume_Template.pdf"));