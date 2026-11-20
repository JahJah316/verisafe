(() => {
  const defaults = { theme: "system", accent: "blue", font: "system", size: "medium" };
  const choices = {
    theme: ["system", "light", "dark"],
    accent: ["blue", "teal", "green", "purple", "orange", "pink"],
    font: ["system", "times", "georgia", "verdana", "mono"],
    size: ["small", "medium", "large"],
  };
  const storageKey = "verisafe-settings";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let settings = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    for (const key of Object.keys(defaults)) {
      if (choices[key].includes(saved?.[key])) settings[key] = saved[key];
    }
  } catch {
    // Settings still work for this visit if browser storage is unavailable.
  }

  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = settings.theme === "system" ? (systemTheme.matches ? "dark" : "light") : settings.theme;
    root.dataset.accent = settings.accent;
    root.dataset.font = settings.font;
    root.dataset.size = settings.size;
  }
  function saveSettings() {
    applySettings();
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Keep the current choices in memory. */ }
  }
  applySettings();
  systemTheme.addEventListener("change", applySettings);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("settingsButton");
    const panel = document.getElementById("settingsPanel");
    const theme = document.getElementById("themeSetting");
    const font = document.getElementById("fontSetting");
    const size = document.getElementById("sizeSetting");
    const accents = panel.querySelectorAll('input[name="accent"]');
    function syncControls() {
      theme.value = settings.theme;
      font.value = settings.font;
      size.value = settings.size;
      accents.forEach((input) => { input.checked = input.value === settings.accent; });
    }
    function closePanel(returnFocus = false) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (returnFocus) button.focus();
    }
    syncControls();
    button.addEventListener("click", () => {
      if (!panel.hidden) return closePanel();
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      theme.focus();
    });
    document.getElementById("settingsDone").addEventListener("click", () => closePanel(true));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) closePanel(true);
    });
    document.addEventListener("click", (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !button.contains(event.target)) closePanel();
    });
    for (const [control, key] of [[theme, "theme"], [font, "font"], [size, "size"]]) {
      control.addEventListener("change", () => { settings[key] = control.value; saveSettings(); });
    }
    accents.forEach((input) => input.addEventListener("change", () => {
      if (input.checked) { settings.accent = input.value; saveSettings(); }
    }));
    document.getElementById("settingsReset").addEventListener("click", () => {
      settings = { ...defaults };
      syncControls();
      saveSettings();
    });
  });
})();
