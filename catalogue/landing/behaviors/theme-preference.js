(() => {
  // First paint belongs to the page: this runs in the head, before the body
  // renders, so a saved preference never flashes the other theme. The package
  // Theme toggle behavior owns the control itself once the runtime loads.
  const root = document.documentElement;
  const key = root.dataset.discernThemeStorageKey;
  if (!key) return;
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") {
      root.dataset.discernTheme = saved;
    }
  } catch {
    // Storage can be unavailable; the media query still resolves the theme.
  }
})();
