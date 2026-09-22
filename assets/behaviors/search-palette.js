(() => {
  const key = Symbol.for("discern.search-palette");
  if (document[key]) return;
  document[key] = true;
  const palettes = "[data-discern-root] dialog[data-discern-search-palette]";
  const focusable =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const states = new WeakMap();
  const field = (palette) =>
    palette.querySelector("[data-discern-search-palette-input]");
  const opened = () =>
    [...document.querySelectorAll(palettes)].find((palette) =>
      states.has(palette)
    );
  // An opener names its palette through aria-controls, or reaches the first
  // static palette in its own root.
  const target = (opener) => {
    const id = opener.getAttribute("aria-controls");
    const palette = id
      ? document.getElementById(id)
      : opener.closest("[data-discern-root]")?.querySelector(palettes);
    return palette?.matches(palettes) ? palette : null;
  };
  // Everything outside the palette goes inert when the dialog cannot be
  // modal: the siblings of every ancestor on the way up to the body.
  const inertOutside = (palette) => {
    const made = [];
    for (
      let node = palette;
      node && node !== document.body;
      node = node.parentElement
    ) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (sibling !== node && !sibling.inert) {
          sibling.inert = true;
          made.push(sibling);
        }
      }
    }
    return made;
  };
  const expand = (palette, expanded) => {
    const input = field(palette);
    if (input?.getAttribute("role") === "combobox") {
      input.setAttribute("aria-expanded", String(expanded));
    }
  };
  const show = (palette) => {
    if (palette.open || !palette.isConnected) return;
    const state = {
      returnFocus: document.activeElement,
      fallback: typeof palette.showModal !== "function",
      inerted: [],
      overflow: document.body.style.overflow,
    };
    states.set(palette, state);
    if (state.fallback) {
      palette.setAttribute("open", "");
      palette.setAttribute("data-discern-search-palette-fallback", "");
      state.inerted = inertOutside(palette);
    } else palette.showModal();
    document.body.style.overflow = "hidden";
    expand(palette, true);
    palette.dispatchEvent(
      new CustomEvent("discern:search-palette:open", { bubbles: true }),
    );
    field(palette)?.focus();
  };
  const open = (palette) => {
    if (palette.open) return;
    // An open drawer yields to the palette through its own toggle, and the
    // palette opens once the drawer has closed and handed focus back to it.
    const toggle = palette.closest("[data-discern-root]")?.querySelector(
      '[data-discern-docs-drawer-toggle][aria-expanded="true"]',
    );
    if (!toggle) return show(palette);
    toggle.click();
    queueMicrotask(() => show(palette));
  };
  const finish = (palette, restore = true) => {
    const state = states.get(palette);
    if (!state) return;
    states.delete(palette);
    for (const element of state.inerted) element.inert = false;
    palette.removeAttribute("data-discern-search-palette-fallback");
    document.body.style.overflow = state.overflow;
    expand(palette, false);
    const { returnFocus } = state;
    if (
      restore && returnFocus?.isConnected && !returnFocus.closest("[inert]")
    ) {
      returnFocus.focus();
    }
    palette.dispatchEvent(
      new CustomEvent("discern:search-palette:close", { bubbles: true }),
    );
  };
  const close = (palette, restore = true) => {
    if (!states.has(palette)) return;
    if (states.get(palette).fallback) {
      palette.removeAttribute("open");
      finish(palette, restore);
    } else if (restore) palette.close();
    else {
      finish(palette, false);
      palette.close();
    }
  };
  const click = (event) => {
    const element = event.target instanceof Element ? event.target : null;
    const opener = element?.closest("[data-discern-search-palette-open]");
    const closer = element?.closest("[data-discern-search-palette-close]");
    // Wait for the complete dispatch, including React and consumer cancellation.
    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      const palette = opener ? target(opener) : closer?.closest(palettes);
      if (!palette) return;
      if (opener) open(palette);
      else close(palette);
    });
  };
  // A press on the backdrop lands on the dialog itself, or outside it when
  // the dialog could not be modal.
  const press = (event) => {
    const palette = opened();
    if (
      palette && (event.target === palette || !palette.contains(event.target))
    ) close(palette);
  };
  const editable = (element) =>
    element instanceof HTMLElement &&
    (element.isContentEditable ||
      /^(input|select|textarea)$/i.test(element.tagName));
  const keydown = (event) => {
    const palette = opened();
    const shortcuts = document.querySelector(
      `${palettes}[data-discern-search-palette-shortcuts]`,
    );
    if (
      shortcuts && (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      if (palette) close(palette);
      else open(shortcuts);
      return;
    }
    if (palette) {
      if (!states.get(palette).fallback) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(palette);
        return;
      }
      if (event.key !== "Tab") return;
      const ring = [...palette.querySelectorAll(focusable)].filter((element) =>
        !element.closest("[hidden]")
      );
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (
      shortcuts && event.key === "/" && !event.metaKey && !event.ctrlKey &&
      !event.altKey && !editable(document.activeElement)
    ) {
      event.preventDefault();
      open(shortcuts);
    }
  };
  // The native dialog closes itself on Escape; closing restores focus and
  // releases what opening took, whichever route closed it.
  const closed = (event) => {
    if (event.target instanceof Element && event.target.matches(palettes)) {
      finish(event.target);
    }
  };
  globalThis.addEventListener("click", click);
  document.addEventListener("mousedown", press);
  document.addEventListener("keydown", keydown);
  document.addEventListener("close", closed, true);
  document.addEventListener("discern:search-palette:teardown", () => {
    globalThis.removeEventListener("click", click);
    document.removeEventListener("mousedown", press);
    document.removeEventListener("keydown", keydown);
    document.removeEventListener("close", closed, true);
    for (const palette of document.querySelectorAll(palettes)) {
      close(palette, false);
    }
    delete document[key];
  }, { once: true });
})();
