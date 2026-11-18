// Checks each download the moment it starts, using the name and link only.
// This is the part the website cannot do: warn before the file is opened.
import { analyze } from "./lib/analyze.js";

const NOTIFY_LEVELS = new Set(["medium", "high"]);

const NOTIFICATION_TITLES = {
  medium: "This download looks risky",
  high: "This download looks very risky",
};

// The report is popup.html: the same page the toolbar icon opens. Chrome only
// opens a toolbar popup on a click, never from code, so a risky download opens
// the same page in its own small window instead. The body is 360px wide, so
// 380 leaves room for the window frame.
const REPORT_URL = chrome.runtime.getURL("popup.html");
const REPORT_SIZE = { width: 380, height: 560 };

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

let reportWindowId = null;

// Only one report window at a time, and a fresh one each download: a window
// left open from an earlier file would otherwise show that file's verdict.
async function openReportWindow() {
  if (reportWindowId !== null) {
    try {
      await chrome.windows.remove(reportWindowId);
    } catch {
      // Already closed by the user.
    }
    reportWindowId = null;
  }

  const openWindows = await chrome.windows.getAll({ populate: true });
  for (const window of openWindows) {
    if (window.tabs?.some((tab) => tab.url === REPORT_URL)) {
      try {
        await chrome.windows.remove(window.id);
      } catch {
        // Already closed by the user.
      }
    }
  }

  try {
    const created = await chrome.windows.create({
      url: REPORT_URL,
      type: "popup",
      ...REPORT_SIZE,
      focused: true,
    });
    reportWindowId = created?.id ?? null;
  } catch (error) {
    // The notification already went out, so a window Chrome refuses to open
    // must not take down the download listener.
    console.warn("Verisafe could not open the report window:", error);
  }
}

chrome.downloads.onCreated.addListener(async (item) => {
  const url = item.finalUrl || item.url || "";
  const name = nameFromPath(item.filename) || fallbackName(url);
  const result = analyze(name, url);

  // The report window reads this as soon as it loads, so write it first.
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

  if (!NOTIFY_LEVELS.has(result.level)) return;

  const reason = result.reasons[0] ?? "Verisafe found warning signs in the name or the link.";
  chrome.notifications.create(`verisafe-${item.id}`, {
    type: "basic",
    iconUrl: "icons/128.png",
    title: `Verisafe: ${NOTIFICATION_TITLES[result.level]}`,
    message: shorten(`${name} — ${reason}`, 200),
    priority: 2,
  });

  await openReportWindow();
});
