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
  if (RISKY_EXTENSIONS.includes(ext)) {
    return {points: WEIGHTS.riskyType , reason: 'This is a program or script file (.${ext}), which can run code on your computer if you open it.' };
  }
  return null;
}

console.log(getExtension("Zoom_Installer.pdf.exe"));
console.log(getExtension("SETUP.EXE"));

console.log(checkRiskyType("Zoom_Installer.exe"));
console.log(checkRiskyType("Resume_Template.pdf"));
console.log(checkRiskyType("SETUP.EXE"));