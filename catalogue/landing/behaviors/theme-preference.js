(() => {
  const root = document.documentElement;
  const key = root.dataset.discernThemeStorageKey;
  const preference = matchMedia("(prefers-color-scheme: dark)");
  const isTheme = (value) => value === "light" || value === "dark";

  const storedTheme = () => {
    if (!key) return null;
    try {
      const value = localStorage.getItem(key);
      return isTheme(value) ? value : null;
    } catch {
      return null;
    }
  };

  const persistTheme = (theme) => {
    if (!key) return;
    try {
      localStorage.setItem(key, theme);
    } catch {
      // Storage can be unavailable without blocking the immediate change.
    }
  };

  const systemTheme = () => preference.matches ? "dark" : "light";

  const updateControl = (control, theme) => {
    const dark = theme === "dark";
    const label = dark
      ? control.dataset.discernToLightLabel
      : control.dataset.discernToDarkLabel;
    if (label) control.setAttribute("aria-label", label);
    const glyph = control.querySelector(".discern-theme-toggle__glyph");
    const glyphText = dark
      ? control.dataset.discernLightGlyph
      : control.dataset.discernDarkGlyph;
    if (glyph && glyphText) glyph.textContent = glyphText;
  };

  const applyTheme = (theme, persist) => {
    root.dataset.discernTheme = theme;
    for (
      const control of root.querySelectorAll("[data-discern-theme-control]")
    ) {
      updateControl(control, theme);
    }
    if (persist) persistTheme(theme);
  };

  applyTheme(storedTheme() ?? systemTheme(), false);

  const enhance = () => {
    const theme = isTheme(root.dataset.discernTheme)
      ? root.dataset.discernTheme
      : systemTheme();
    for (
      const control of root.querySelectorAll("[data-discern-theme-control]")
    ) {
      updateControl(control, theme);
      control.addEventListener("click", () => {
        const next = root.dataset.discernTheme === "dark" ? "light" : "dark";
        applyTheme(next, true);
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance, { once: true });
  } else {
    enhance();
  }

  preference.addEventListener("change", () => {
    if (storedTheme() === null) applyTheme(systemTheme(), false);
  });
})();
