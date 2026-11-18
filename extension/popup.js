// The popup runs the same engine as the website, on what an extension can see:
// the file name and the link. It cannot read the file's contents.
import { analyze } from "./lib/analyze.js";
import { looksLikeFileName } from "./lib/rules.js";
import { initTheme, toggleTheme } from "./theme.js";

// Where the "Open full checker" button goes: the hosted checker. For local work
// swap this for http://127.0.0.1:8137/website/index.html and run dev-server.js.
const SITE_URL = "https://verisafe.pages.dev/website/";

// Same wording as the website
const TITLES = {
  low: "No warning signs found",
  medium: "This looks risky: be careful",
  high: "This looks very risky",
};

const subjectTitle = document.getElementById("subjectTitle");
const subjectDetail = document.getElementById("subjectDetail");
const resultCard = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const resultReasons = document.getElementById("resultReasons");
const resultAction = document.getElementById("resultAction");
const resultScope = document.getElementById("resultScope");
const openChecker = document.getElementById("openChecker");
const openSettings = document.getElementById("openSettings");
const themeButton = document.getElementById("toggleTheme");
const iconMoon = document.getElementById("iconMoon");
const iconSun = document.getElementById("iconSun");

// A link to a file usually ends in a name with a dot, like …/Zoom_Installer.exe
function fileNameFromUrl(value) {
  try {
    const parsed = new URL(value);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const name = decodeURIComponent(last);
    return looksLikeFileName(name) ? name : "";
  } catch {
    return "";
  }
}

function showVerdict(result, name, url, where) {
  subjectTitle.textContent = name;
  subjectDetail.textContent = url;

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
  resultScope.textContent = `Checked: ${where}. The file's contents were not read.`;
  resultCard.hidden = false;
}

function showNothingToCheck() {
  subjectTitle.textContent = "Nothing to check yet";
  subjectDetail.textContent =
    "Open a page that links to a file, or start a download. Verisafe checks the file name and the link.";
  resultCard.hidden = true;
}

async function run() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url ?? "";
  const tabName = fileNameFromUrl(tabUrl);

  if (tabName) {
    showVerdict(analyze(tabName, tabUrl), tabName, tabUrl, "file name and link on this page");
    return;
  }

  const { lastDownload } = await chrome.storage.session.get("lastDownload");
  if (lastDownload?.fileName) {
    showVerdict(
      analyze(lastDownload.fileName, lastDownload.url),
      lastDownload.fileName,
      lastDownload.url,
      "file name and link of your last download"
    );
    return;
  }

  showNothingToCheck();
}

openChecker.addEventListener("click", () => {
  chrome.tabs.create({ url: SITE_URL });
});

// Opening the options page dismisses the popup on its own, so no window.close().
openSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Shows the icon for what the button switches to, not the current theme.
// The icons are SVG, where `element.hidden = true` only sets an expando, so the
// attribute has to be toggled explicitly for them to actually hide.
function renderTheme(theme) {
  const next = theme === "dark" ? "light" : "dark";
  themeButton.title = `Switch to ${next} mode`;
  themeButton.setAttribute("aria-label", `Switch to ${next} mode`);
  iconMoon.toggleAttribute("hidden", theme === "dark");
  iconSun.toggleAttribute("hidden", theme !== "dark");
}

themeButton.addEventListener("click", async () => {
  renderTheme(await toggleTheme());
});

initTheme().then(renderTheme).catch(() => {});

run().catch(() => {
  subjectTitle.textContent = "Could not check this page";
  subjectDetail.textContent = "Reload the page and try again.";
  resultCard.hidden = true;
});
