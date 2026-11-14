// Checks each download the moment it starts, using the name and link only.
// This is the part the website cannot do: warn before the file is opened.
import { analyze } from "./lib/analyze.js";

const NOTIFY_LEVELS = new Set(["medium", "high"]);

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

chrome.downloads.onCreated.addListener((item) => {
  const url = item.finalUrl || item.url || "";
  const name = nameFromPath(item.filename) || fallbackName(url);
  const result = analyze(name, url);

  // The popup reads this when you open it after a download.
  chrome.storage.session.set({
    lastDownload: {
      fileName: name,
      url,
      level: result.level,
      score: result.score,
      reasons: result.reasons,
      checkedAt: Date.now(),
    },
  });

  if (!NOTIFY_LEVELS.has(result.level)) return;

  const reason = result.reasons[0] ?? "Verisafe found warning signs in the name or the link.";
  chrome.notifications.create(`verisafe-${item.id}`, {
    type: "basic",
    iconUrl: "icons/128.png",
    title: `Verisafe: ${NOTIFICATION_TITLES[result.level]}`,
    message: shorten(`${name} — ${reason}`, 200),
    priority: 2,
  });
});
