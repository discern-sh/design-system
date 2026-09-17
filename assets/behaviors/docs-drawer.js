(() => {
  const key = Symbol.for("discern.docs-drawer");
  if (document[key]) return;
  document[key] = true;
  const selector =
    "[data-discern-root] [data-discern-docs-drawer-toggle][aria-controls]";
  const focusable =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const entries = new Map();
  const focusables = (container) =>
    [...container.querySelectorAll(focusable)].filter((element) =>
      !element.closest("[hidden],[inert]")
    );
  // The stylesheet decides when the navigation is a drawer; the behaviour asks.
  const narrow = (entry) =>
    getComputedStyle(entry.navigation).getPropertyValue(
      "--discern-docs-layout-drawer",
    ).trim() === "1";
  const opened = () => [...entries.values()].find((entry) => entry.open);
  // Everything outside the toggle, the navigation, and the veil goes inert:
  // the siblings of every ancestor on the way up to the body.
  const inertOutside = (kept) => {
    const keep = new Set();
    for (const element of kept) {
      for (
        let node = element;
        node && node !== document.body;
        node = node.parentElement
      ) {
        keep.add(node);
      }
    }
    const made = [];
    for (const node of keep) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (!keep.has(sibling) && !sibling.inert) {
          sibling.inert = true;
          made.push(sibling);
        }
      }
    }
    return made;
  };
  const sync = (entry) => {
    const drawer = narrow(entry);
    if (!drawer && entry.open) close(entry, false);
    entry.toggle.hidden = !drawer;
    entry.navigation.inert = drawer && !entry.open;
    if (drawer) {
      entry.layout.setAttribute(
        "data-discern-docs-drawer",
        entry.open ? "open" : "closed",
      );
    } else entry.layout.removeAttribute("data-discern-docs-drawer");
    entry.toggle.setAttribute("aria-expanded", String(entry.open));
    const label = entry.open
      ? entry.toggle.dataset.discernCloseLabel
      : entry.toggle.dataset.discernOpenLabel;
    if (label) entry.toggle.setAttribute("aria-label", label);
  };
  const open = (entry) => {
    if (entry.open || !narrow(entry)) return;
    entry.open = true;
    const { navigation, veil } = entry;
    navigation.setAttribute("role", "dialog");
    navigation.setAttribute("aria-modal", "true");
    const label = navigation.dataset.discernDocsDrawerLabel;
    if (label) navigation.setAttribute("aria-label", label);
    entry.inerted = inertOutside([entry.toggle, navigation, veil]);
    entry.overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (veil) veil.hidden = false;
    sync(entry);
    queueMicrotask(() => {
      if (entry.open) focusables(navigation)[0]?.focus();
    });
  };
  const close = (entry, restore = true) => {
    if (!entry.open) return;
    entry.open = false;
    const { navigation, veil } = entry;
    navigation.removeAttribute("role");
    navigation.removeAttribute("aria-modal");
    navigation.removeAttribute("aria-label");
    for (const element of entry.inerted) element.inert = false;
    entry.inerted = [];
    document.body.style.overflow = entry.overflow;
    if (veil) veil.hidden = true;
    sync(entry);
    if (restore) entry.toggle.focus();
  };
  const release = (toggle, entry) => {
    close(entry, false);
    entries.delete(toggle);
    resizes.unobserve(entry.layout);
    toggle.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    entry.navigation.inert = false;
    entry.layout.removeAttribute("data-discern-docs-drawer");
    if (entry.marked) {
      entry.layout.removeAttribute("data-discern-docs-drawer-enhanced");
    }
  };
  const refresh = () => {
    const toggles = new Set(document.querySelectorAll(selector));
    for (const [toggle, entry] of entries) {
      if (
        !toggles.has(toggle) || !entry.navigation.isConnected ||
        !entry.layout.isConnected ||
        toggle.getAttribute("aria-controls") !== entry.navigation.id
      ) release(toggle, entry);
    }
    for (const toggle of toggles) {
      if (entries.has(toggle)) continue;
      const navigation = document.getElementById(
        toggle.getAttribute("aria-controls"),
      );
      const layout = navigation?.closest("[data-discern-docs-layout]");
      if (!layout) continue;
      const entry = {
        toggle,
        navigation,
        layout,
        veil: layout.querySelector("[data-discern-docs-drawer-veil]"),
        open: false,
        inerted: [],
        overflow: "",
        marked: !layout.hasAttribute("data-discern-docs-drawer-enhanced"),
      };
      entries.set(toggle, entry);
      layout.setAttribute("data-discern-docs-drawer-enhanced", "");
      resizes.observe(layout);
      // Activation snaps the navigation into its resting state; the slide
      // arms only for the changes a reader makes afterwards.
      navigation.style.transition = "none";
      sync(entry);
      void getComputedStyle(navigation).display;
      navigation.style.transition = "";
    }
  };
  const click = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const toggle = target?.closest("[data-discern-docs-drawer-toggle]");
    const veil = target?.closest("[data-discern-docs-drawer-veil]");
    // Wait for the complete dispatch, including React and consumer cancellation.
    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      const entry = toggle
        ? entries.get(toggle)
        : [...entries.values()].find((candidate) => candidate.veil === veil);
      if (!entry) return;
      if (toggle) {
        if (entry.open) close(entry);
        else open(entry);
      } else close(entry);
    });
  };
  const keydown = (event) => {
    const entry = opened();
    if (!entry) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(entry);
      return;
    }
    if (event.key !== "Tab") return;
    const ring = [entry.toggle, ...focusables(entry.navigation)];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const resizes = new ResizeObserver(() => {
    for (const entry of entries.values()) sync(entry);
  });
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "data-discern-root",
      "data-discern-docs-drawer-toggle",
      "aria-controls",
    ],
  });
  refresh();
  globalThis.addEventListener("click", click);
  document.addEventListener("keydown", keydown);
  document.addEventListener("discern:docs-drawer:teardown", () => {
    observer.disconnect();
    resizes.disconnect();
    globalThis.removeEventListener("click", click);
    document.removeEventListener("keydown", keydown);
    for (const [toggle, entry] of entries) release(toggle, entry);
    delete document[key];
  }, { once: true });
})();
