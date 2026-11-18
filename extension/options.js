import { getRegistrableDomain } from "./lib/rules.js";
import { initTheme } from "./theme.js";

// Keep these in step with DEFAULT_PREFS in background.js.
const DEFAULT_PREFS = { warnLevel: "medium", trustedSites: [] };
const WARN_LEVELS = ["medium", "high", "never"];

const radios = [...document.querySelectorAll("input[name='warnLevel']")];
const form = document.getElementById("addSiteForm");
const siteInput = document.getElementById("siteInput");
const siteError = document.getElementById("siteError");
const siteList = document.getElementById("siteList");
const emptyNote = document.getElementById("emptyNote");
const status = document.getElementById("status");

let prefs = { ...DEFAULT_PREFS };
let statusTimer;

function showStatus(text) {
  status.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

function renderSites() {
  siteList.textContent = "";
  emptyNote.hidden = prefs.trustedSites.length > 0;

  for (const site of prefs.trustedSites) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = site;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => removeSite(site));

    item.append(name, remove);
    siteList.append(item);
  }
}

function renderLevels() {
  for (const radio of radios) {
    radio.checked = radio.value === prefs.warnLevel;
  }
}

async function load() {
  const stored = await chrome.storage.sync.get(DEFAULT_PREFS);
  prefs = {
    warnLevel: WARN_LEVELS.includes(stored.warnLevel) ? stored.warnLevel : DEFAULT_PREFS.warnLevel,
    trustedSites: Array.isArray(stored.trustedSites) ? stored.trustedSites : [],
  };
  renderLevels();
  renderSites();
}

async function removeSite(site) {
  prefs.trustedSites = prefs.trustedSites.filter((entry) => entry !== site);
  await chrome.storage.sync.set({ trustedSites: prefs.trustedSites });
  renderSites();
  showStatus(`Removed ${site}.`);
}

for (const radio of radios) {
  radio.addEventListener("change", async () => {
    if (!radio.checked) return;
    prefs.warnLevel = radio.value;
    await chrome.storage.sync.set({ warnLevel: prefs.warnLevel });
    showStatus("Saved.");
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  siteError.textContent = "";

  const typed = siteInput.value.trim().toLowerCase();
  if (!typed) return;
  if (!typed.includes(".")) {
    siteError.textContent = "Type a domain, like github.com.";
    return;
  }

  // Trust is stored as the registrable domain, the same way the checks read a
  // host, so "objects.github.com" and "github.com" are one entry.
  const site = getRegistrableDomain(typed);
  if (prefs.trustedSites.includes(site)) {
    siteError.textContent = `${site} is already trusted.`;
    return;
  }

  prefs.trustedSites.push(site);
  siteInput.value = "";
  await chrome.storage.sync.set({ trustedSites: prefs.trustedSites });
  renderSites();
  showStatus(site === typed ? `Trusting ${site}.` : `Trusting ${site} (from ${typed}).`);
});

// Follow the theme chosen in the popup, so both pages look the same.
initTheme().catch(() => {});

load().catch(() => {
  siteError.textContent = "Settings could not be loaded. Reload this page.";
});
