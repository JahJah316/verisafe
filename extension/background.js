// Checks each download the moment it starts, using the name and link only.
// This is the part the website cannot do: warn before the file is opened.
import { analyze } from "./lib/analyze.js";
import { getRegistrableDomain } from "./lib/rules.js";

// These defaults are the behaviour the extension had before settings existed.
const DEFAULT_PREFS = { warnLevel: "medium", trustedSites: [] };

// Which verdict levels raise a notification, per setting.
const LEVELS_TO_WARN = {
  high: ["high"],
  medium: ["medium", "high"],
  never: [],
};

const NOTIFICATION_TITLES = {
  medium: "This download looks risky",
  high: "This download looks very risky",
};

// Chrome gives a full path like C:\Users\me\Downloads\file.exe
function nameFromPath(value) {
  return (value || "").split(/[\\/]/).pop();
}

function fallbackName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "") || url;
  } catch {
    return url || "Download";
  }
}

function shorten(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function shouldWarn(level, warnLevel) {
  const allowed = LEVELS_TO_WARN[warnLevel] ?? LEVELS_TO_WARN.medium;
  return allowed.includes(level);
}

// Trusted sites are matched on the exact registrable domain, so "github.com"
// also covers objects.github.com but not notgithub.com.
function isTrustedSite(url, trustedSites) {
  if (trustedSites.length === 0) return false;
  try {
    return trustedSites.includes(getRegistrableDomain(new URL(url).hostname));
  } catch {
    return false;
  }
}

chrome.downloads.onCreated.addListener(async (item) => {
  const url = item.finalUrl || item.url || "";
  const name = nameFromPath(item.filename) || fallbackName(url);
  const result = analyze(name, url);

  // The popup reads this when you open it, whatever the warning setting.
  await chrome.storage.session.set({
    lastDownload: {
      fileName: name,
      url,
      level: result.level,
      score: result.score,
      reasons: result.reasons,
      checkedAt: Date.now(),
    },
  });

  // Read the settings on every download: the worker is shut down between
  // downloads, so a value cached in a variable here would go stale.
  const prefs = { ...DEFAULT_PREFS, ...(await chrome.storage.sync.get(DEFAULT_PREFS)) };
  const trustedSites = Array.isArray(prefs.trustedSites) ? prefs.trustedSites : [];

  if (!shouldWarn(result.level, prefs.warnLevel)) return;
  if (isTrustedSite(url, trustedSites)) return;

  const reason = result.reasons[0] ?? "Verisafe found warning signs in the name or the link.";
  chrome.notifications.create(`verisafe-${item.id}`, {
    type: "basic",
    iconUrl: "icons/128.png",
    title: `Verisafe: ${NOTIFICATION_TITLES[result.level]}`,
    message: shorten(`${name} — ${reason}`, 200),
    priority: 2,
  });
});
