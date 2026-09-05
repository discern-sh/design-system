(() => {
  const key = Symbol.for("discern.copy-button");
  if (document[key]) return;
  document[key] = true;
  const selector = "button[data-discern-copy-value]";
  const entries = new Map();
  const state = (button, value) => {
    const entry = entries.get(button);
    if (entry) entry.state = value;
    button.toggleAttribute("data-discern-copied", value === "copied");
    button.toggleAttribute("data-discern-copy-failed", value === "failed");
    for (
      const label of button.querySelectorAll("[data-discern-copy-feedback]")
    ) {
      label.hidden = !label.dataset.discernCopyFeedback.split(" ").includes(
        value,
      );
    }
  };
  const release = (button, entry) => {
    clearTimeout(entry.timer);
    entries.delete(button);
    button.inert = true;
    button.removeAttribute("aria-busy");
    state(button, "idle");
  };
  const refresh = () => {
    const buttons = new Set(
      document.querySelectorAll(`[data-discern-root] ${selector}`),
    );
    for (const [button, entry] of entries) {
      if (!buttons.has(button)) release(button, entry);
    }
    for (const button of buttons) {
      const value = button.dataset.discernCopyValue;
      const entry = entries.get(button);
      if (entry && entry.value !== value) release(button, entry);
      if (!entries.has(button)) entries.set(button, { value });
      button.inert = false;
      state(button, entries.get(button).state ?? "idle");
    }
  };
  const click = (event) => {
    const button = event.target instanceof Element &&
      event.target.closest(selector);
    // Wait for the complete dispatch, including React and consumer cancellation.
    queueMicrotask(async () => {
      const entry = entries.get(button);
      if (
        !entry || entry.pending || event.defaultPrevented ||
        !button.isConnected ||
        !button.closest("[data-discern-root]") || button.matches(":disabled") ||
        button.closest("[inert]") ||
        button.getAttribute("aria-disabled") === "true"
      ) return;
      clearTimeout(entry.timer);
      entry.pending = true;
      state(button, "idle");
      button.setAttribute("aria-busy", "true");
      let result = "copied";
      try {
        await navigator.clipboard.writeText(
          JSON.parse(button.dataset.discernCopyValue),
        );
      } catch {
        result = "failed";
      }
      if (entries.get(button) !== entry || !button.isConnected) return;
      entry.pending = false;
      button.removeAttribute("aria-busy");
      state(button, result);
      if (result === "copied") {
        entry.timer = setTimeout(
          () => state(button, "idle"),
          Number(button.dataset.discernCopyDuration),
        );
      }
    });
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-discern-root", "data-discern-copy-value"],
  });
  refresh();
  globalThis.addEventListener("click", click);
  document.addEventListener("discern:copy-button:teardown", () => {
    observer.disconnect();
    globalThis.removeEventListener("click", click);
    for (const [button, entry] of entries) release(button, entry);
    delete document[key];
  }, { once: true });
})();
