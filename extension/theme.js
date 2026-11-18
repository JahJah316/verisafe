// Light/dark handling shared by the popup and the settings page.
// The stored value is "system" (follow the OS, and the default), "light" or
// "dark". The override itself lives in tokens.css, generated from the site's
// palette, so a themed extension still uses the site's exact colours.
const DEFAULT_THEME = "system";

export async function readTheme() {
  const stored = await chrome.storage.sync.get({ theme: DEFAULT_THEME });
  const value = stored.theme;
  return value === "light" || value === "dark" ? value : "system";
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") {
    root.dataset.theme = theme;
  } else {
    delete root.dataset.theme;
  }
}

// What the page is actually showing right now.
export function shownTheme(theme) {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Apply the stored theme and report what is now on screen.
export async function initTheme() {
  const theme = await readTheme();
  applyTheme(theme);
  return shownTheme(theme);
}

// Flip to the opposite of what is on screen and remember that choice.
export async function toggleTheme() {
  const next = shownTheme(await readTheme()) === "dark" ? "light" : "dark";
  await chrome.storage.sync.set({ theme: next });
  applyTheme(next);
  return next;
}
