(() => {
  const rootSelector = "[data-discern-floating-root]";
  const triggerSelector = "[data-discern-floating-trigger]";
  const panelSelector = "[data-discern-floating-panel]";
  const enhancedAttribute = "data-discern-floating-enhanced";
  const positionedAttribute = "data-discern-floating-positioned";
  const actualPlacementAttribute = "data-discern-floating-actual-placement";
  const entries = new WeakMap();
  let activeEntry = null;
  let closeTimer;
  let positionFrame;

  if (
    !Object.hasOwn(HTMLElement.prototype, "popover") ||
    typeof HTMLElement.prototype.showPopover !== "function"
  ) {
    return;
  }

  const clamp = (minimum, value, maximum) =>
    Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

  const tokenLength = (root, name, fallback) => {
    const value = Number.parseFloat(
      getComputedStyle(root).getPropertyValue(name),
    );
    return Number.isFinite(value) ? value : fallback;
  };

  const isOpen = (panel) => panel.matches(":popover-open");

  const position = (entry) => {
    const { root, trigger, panel } = entry;
    if (!root.isConnected || !isOpen(panel)) return;

    const triggerBounds = trigger.getBoundingClientRect();
    const panelBounds = panel.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const gutter = tokenLength(root, "--discern-space-4", 16);
    const gap = tokenLength(root, "--discern-space-2", 8);
    const align = root.dataset.discernFloatingAlign ?? "center";
    const direction = getComputedStyle(root).direction;
    let left;
    if (align === "center") {
      left = triggerBounds.left +
        (triggerBounds.width - panelBounds.width) / 2;
    } else {
      const alignLeft = align === "start"
        ? direction !== "rtl"
        : direction === "rtl";
      left = alignLeft
        ? triggerBounds.left
        : triggerBounds.right - panelBounds.width;
    }
    left = clamp(
      gutter,
      left,
      viewportWidth - gutter - panelBounds.width,
    );

    const above = triggerBounds.top - gap - panelBounds.height;
    const below = triggerBounds.bottom + gap;
    const aboveFits = above >= gutter;
    const belowFits = below + panelBounds.height <= viewportHeight - gutter;
    const requested = root.dataset.discernFloatingPlacement === "bottom"
      ? "bottom"
      : "top";
    let placement = requested;
    if (requested === "top" && !aboveFits && belowFits) placement = "bottom";
    if (requested === "bottom" && !belowFits && aboveFits) placement = "top";
    if (!aboveFits && !belowFits) {
      placement = triggerBounds.top >= viewportHeight - triggerBounds.bottom
        ? "top"
        : "bottom";
    }
    const top = clamp(
      gutter,
      placement === "top" ? above : below,
      viewportHeight - gutter - panelBounds.height,
    );

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.opacity = "1";
    panel.style.pointerEvents = panel.getAttribute("role") === "tooltip"
      ? "none"
      : "auto";
    panel.style.visibility = "visible";
    panel.setAttribute(actualPlacementAttribute, placement);
    panel.setAttribute(positionedAttribute, "");
  };

  const schedulePosition = () => {
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => {
      if (activeEntry) position(activeEntry);
    });
  };

  const close = (entry, restoreFocus = false) => {
    clearTimeout(closeTimer);
    if (!entry || activeEntry !== entry) return;
    const { trigger, panel } = entry;
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.visibility = "hidden";
    panel.removeAttribute(positionedAttribute);
    panel.removeAttribute(actualPlacementAttribute);
    if (isOpen(panel)) panel.hidePopover();
    activeEntry = null;
    if (restoreFocus && trigger.isConnected) trigger.focus();
  };

  const open = (entry) => {
    clearTimeout(closeTimer);
    if (activeEntry && activeEntry !== entry) close(activeEntry);
    const { trigger, panel } = entry;
    activeEntry = entry;
    if (!isOpen(panel)) {
      try {
        panel.showPopover({ source: trigger });
      } catch {
        panel.showPopover();
      }
    }
    schedulePosition();
  };

  const scheduleClose = (entry) => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (
        activeEntry === entry &&
        !entry.root.matches(":hover") &&
        !entry.root.contains(document.activeElement)
      ) {
        close(entry);
      }
    }, 80);
  };

  const ownedDescendant = (root, selector) =>
    [...root.querySelectorAll(selector)].find((candidate) =>
      candidate.closest(rootSelector) === root
    );

  const enhance = (root) => {
    if (entries.has(root)) return;
    const trigger = ownedDescendant(root, triggerSelector);
    const panel = ownedDescendant(root, panelSelector);
    if (!(trigger instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }
    const entry = { root, trigger, panel };
    entries.set(root, entry);
    panel.setAttribute("popover", "manual");
    panel.setAttribute(enhancedAttribute, "");
    panel.style.inset = "auto";
    panel.style.margin = "0";
    panel.style.opacity = "0";
    panel.style.pointerEvents = "none";
    panel.style.position = "fixed";
    panel.style.translate = "0 0";
    panel.style.visibility = "hidden";
    root.addEventListener("pointerenter", () => open(entry));
    root.addEventListener("pointerleave", () => scheduleClose(entry));
    root.addEventListener("focusin", () => open(entry));
    root.addEventListener("focusout", () => scheduleClose(entry));
  };

  const enhanceWithin = (node) => {
    if (!(node instanceof Element || node instanceof Document)) return;
    if (node instanceof Element && node.matches(rootSelector)) enhance(node);
    for (const root of node.querySelectorAll(rootSelector)) enhance(root);
  };

  enhanceWithin(document);
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) enhanceWithin(node);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("pointerdown", (event) => {
    if (
      activeEntry && event.target instanceof Node &&
      !activeEntry.root.contains(event.target)
    ) {
      close(activeEntry);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeEntry) return;
    const entry = activeEntry;
    const restoreFocus = entry.root.contains(document.activeElement);
    close(entry, restoreFocus);
  });
  document.addEventListener("scroll", schedulePosition, true);
  globalThis.addEventListener("resize", schedulePosition);
})();
