(() => {
  const key = Symbol.for("discern.theme-toggle");
  if (document[key]) return;
  document[key] = true;
  const selector = "button[data-discern-theme-toggle]";
  const media = matchMedia("(prefers-color-scheme: dark)");
  const controls = () =>
    document.querySelectorAll(`[data-discern-root] ${selector}`);
  const known = (value) => value === "light" || value === "dark" ? value : null;
  const stored = (root) => {
    const name = root.dataset.discernThemeStorageKey;
    if (!name) return null;
    try {
      return known(localStorage.getItem(name));
    } catch {
      return null;
    }
  };
  const applied = (root) =>
    known(root.dataset.discernTheme) ?? (media.matches ? "dark" : "light");
  const refresh = () => {
    for (const button of controls()) {
      const root = button.closest("[data-discern-root]");
      // A saved preference outranks the markup: the consumer paints first, and
      // this heals a root left out of step with what the reader chose.
      const saved = stored(root);
      if (saved && root.dataset.discernTheme !== saved) {
        root.dataset.discernTheme = saved;
      }
      const destination = applied(root) === "dark" ? "light" : "dark";
      const label = destination === "dark"
        ? button.dataset.discernToDarkLabel
        : button.dataset.discernToLightLabel;
      if (label) button.setAttribute("aria-label", label);
      for (
        const glyph of button.querySelectorAll(
          "[data-discern-theme-destination]",
        )
      ) {
        glyph.hidden = glyph.dataset.discernThemeDestination !== destination;
      }
      button.inert = false;
    }
  };
  const click = (event) => {
    const button = event.target instanceof Element &&
      event.target.closest(selector);
    // Wait for the complete dispatch, including React and consumer cancellation.
    queueMicrotask(() => {
      const root = button && button.closest("[data-discern-root]");
      if (
        !root || event.defaultPrevented || !button.isConnected ||
        button.matches(":disabled") || button.closest("[inert]") ||
        button.getAttribute("aria-disabled") === "true"
      ) return;
      const next = applied(root) === "dark" ? "light" : "dark";
      root.dataset.discernTheme = next;
      const name = root.dataset.discernThemeStorageKey;
      if (name) {
        try {
          localStorage.setItem(name, next);
        } catch {
          // Storage can be unavailable without blocking the immediate change.
        }
      }
      refresh();
    });
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-discern-root", "data-discern-theme"],
  });
  refresh();
  globalThis.addEventListener("click", click);
  media.addEventListener("change", refresh);
  document.addEventListener("discern:theme-toggle:teardown", () => {
    observer.disconnect();
    globalThis.removeEventListener("click", click);
    media.removeEventListener("change", refresh);
    for (const button of controls()) button.inert = true;
    delete document[key];
  }, { once: true });
})();
