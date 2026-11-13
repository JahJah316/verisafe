import { analyze } from "../core/analyze.js";

const MAX_SCAN_BYTES = 5 * 1024 * 1024; // only read the first 5 MB of a file

const fileNameInput = document.getElementById("fileName");
const urlInput = document.getElementById("url");
const fileInput = document.getElementById("fileInput");
const fileNote = document.getElementById("fileNote");
const checkButton = document.getElementById("checkButton");
const errorMessage = document.getElementById("errorMessage");
const resultCard = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const resultReasons = document.getElementById("resultReasons");
const resultAction = document.getElementById("resultAction");
const resultScope = document.getElementById("resultScope");
const exampleButtons = document.getElementById("exampleButtons");

const TITLES = {
  low: "No warning signs found",
  medium: "This looks risky: be careful",
  high: "This looks very risky",
};

// The file the user picked (name + first bytes), if any
let pickedFile = { name: "", bytes: null };

function isValidUrl(text) {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) {
    pickedFile = { name: "", bytes: null };
    fileNote.textContent = "";
    return;
  }
  const buffer = await file.slice(0, MAX_SCAN_BYTES).arrayBuffer();
  pickedFile = { name: file.name, bytes: new Uint8Array(buffer) };
  fileNameInput.value = file.name;
  fileNote.textContent = "The file's contents will be scanned on your computer. Nothing is uploaded.";
});

function runCheck() {
  const name = fileNameInput.value.trim();
  const url = urlInput.value.trim();
  errorMessage.textContent = "";

  if (!name) {
    errorMessage.textContent = "Type a file name first.";
    resultCard.hidden = true;
    return;
  }
  if (url !== "" && !isValidUrl(url)) {
    errorMessage.textContent = "That doesn't look like a full link. Start it with http:// or https://";
    resultCard.hidden = true;
    return;
  }

  // Only use the file's bytes if the name still matches the file they picked
  const bytes = name === pickedFile.name ? pickedFile.bytes : null;
  const result = analyze(name, url, bytes);
  showResult(result, url !== "", bytes !== null);
}

function showResult(result, hadLink, scannedContents) {
  resultCard.className = `result ${result.level}`;
  resultTitle.textContent = TITLES[result.level];
  resultScore.textContent = `Score: ${result.score} (low is under 25, medium is 25 to 59, high is 60 or more)`;

  resultReasons.textContent = "";
  const reasons = result.reasons.length > 0
    ? result.reasons
    : ["Nothing suspicious was found in the parts we checked."];
  for (const reason of reasons) {
    const item = document.createElement("li");
    item.textContent = reason;
    resultReasons.append(item);
  }

  resultAction.textContent = result.recommendedAction;

  const checked = ["file name"];
  if (hadLink) checked.push("link");
  if (scannedContents) checked.push("file contents");
  resultScope.textContent = `Checked: ${checked.join(", ")}.`;

  resultCard.hidden = false;
}

checkButton.addEventListener("click", runCheck);
for (const input of [fileNameInput, urlInput]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCheck();
  });
}

// "Try an example" buttons come from the same 10 test cases the tests use
async function loadExamples() {
  try {
    const response = await fetch("../core/cases.json");
    const cases = await response.json();
    for (const example of cases) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "example";
      button.textContent = example.fileName;
      button.addEventListener("click", () => {
        fileInput.value = "";
        pickedFile = { name: "", bytes: null };
        fileNote.textContent = "";
        fileNameInput.value = example.fileName;
        urlInput.value = example.url;
        runCheck();
      });
      exampleButtons.append(button);
    }
  } catch {
    exampleButtons.textContent = "Examples could not be loaded.";
  }
}

loadExamples();