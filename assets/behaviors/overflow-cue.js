import {
  measureOverflowCueState,
  overflowCueAxes,
  overflowCueMarkupAttributes,
  overflowCueStateAttributes,
} from "../../src/internal/overflow-cue-state.js";

(() => {
  const rootSelector = `[${overflowCueMarkupAttributes.root}]`;
  const targetSelector = `[${overflowCueMarkupAttributes.target}]`;
  const enhancedAttribute = overflowCueMarkupAttributes.enhanced;
  const directionAttribute = overflowCueMarkupAttributes.direction;
  const entries = new WeakMap();
  const liveEntries = new Set();
  let rtlScrollType;

  const detectRtlScrollType = () => {
    if (rtlScrollType !== undefined) return rtlScrollType;
    const probe = document.createElement("div");
    const content = document.createElement("div");
    probe.dir = "rtl";
    probe.style.cssText =
      "position:absolute;inset:-10000px auto auto -10000px;width:4px;height:1px;overflow:scroll;visibility:hidden";
    content.style.width = "8px";
    content.style.height = "1px";
    probe.append(content);
    document.documentElement.append(probe);
    if (probe.scrollLeft > 0) {
      rtlScrollType = "default";
    } else {
      probe.scrollLeft = 1;
      rtlScrollType = probe.scrollLeft === 0 ? "negative" : "reverse";
    }
    probe.remove();
    return rtlScrollType;
  };

  const ownedTarget = (root) =>
    [...root.querySelectorAll(targetSelector)].find((candidate) =>
      candidate.closest(rootSelector) === root
    );

  const setAttribute = (root, name, value) => {
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  };

  const targetInsets = (root, target, direction) => {
    const rootBounds = root.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    root.style.setProperty(
      "--discern-overflow-cue-target-top",
      `${Math.max(0, targetBounds.top - rootBounds.top)}px`,
    );
    root.style.setProperty(
      "--discern-overflow-cue-target-right",
      `${Math.max(0, rootBounds.right - targetBounds.right)}px`,
    );
    root.style.setProperty(
      "--discern-overflow-cue-target-bottom",
      `${Math.max(0, rootBounds.bottom - targetBounds.bottom)}px`,
    );
    root.style.setProperty(
      "--discern-overflow-cue-target-left",
      `${Math.max(0, targetBounds.left - rootBounds.left)}px`,
    );
    setAttribute(root, directionAttribute, direction);
  };

  const measure = (entry) => {
    const { root, target } = entry;
    if (!root.isConnected || !target.isConnected) {
      entry.destroy();
      return;
    }
    const candidateAxis = root.getAttribute(overflowCueMarkupAttributes.axis);
    const axis = overflowCueAxes.includes(candidateAxis)
      ? candidateAxis
      : "block";
    const direction = getComputedStyle(target).direction === "rtl"
      ? "rtl"
      : "ltr";
    const state = measureOverflowCueState(
      {
        scrollTop: target.scrollTop,
        scrollLeft: target.scrollLeft,
        scrollWidth: target.scrollWidth,
        scrollHeight: target.scrollHeight,
        clientWidth: target.clientWidth,
        clientHeight: target.clientHeight,
        direction,
      },
      axis,
      detectRtlScrollType(),
    );
    targetInsets(root, target, direction);
    for (
      const [edge, attribute] of Object.entries(
        overflowCueStateAttributes,
      )
    ) {
      setAttribute(root, attribute, state[edge] ? "true" : "false");
    }
  };

  const schedule = (entry) => {
    cancelAnimationFrame(entry.frame);
    entry.frame = requestAnimationFrame(() => measure(entry));
  };

  const enhance = (root) => {
    if (entries.has(root)) return;
    const target = ownedTarget(root);
    if (!(target instanceof HTMLElement)) return;
    const entry = {
      root,
      target,
      frame: undefined,
      resizeObserver: undefined,
      contentObserver: undefined,
      scrollListener: undefined,
      destroy: undefined,
    };
    const observeContentSize = () => {
      if (entry.resizeObserver === undefined) return;
      entry.resizeObserver.disconnect();
      entry.resizeObserver.observe(target);
      for (const child of target.children) {
        entry.resizeObserver.observe(child);
      }
    };
    entry.scrollListener = () => schedule(entry);
    entry.destroy = () => {
      cancelAnimationFrame(entry.frame);
      target.removeEventListener("scroll", entry.scrollListener);
      entry.resizeObserver?.disconnect();
      entry.contentObserver?.disconnect();
      liveEntries.delete(entry);
    };
    entries.set(root, entry);
    liveEntries.add(entry);
    target.addEventListener("scroll", entry.scrollListener, { passive: true });
    if (typeof ResizeObserver === "function") {
      entry.resizeObserver = new ResizeObserver(() => schedule(entry));
      observeContentSize();
    }
    entry.contentObserver = new MutationObserver(() => {
      observeContentSize();
      schedule(entry);
    });
    entry.contentObserver.observe(target, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    root.setAttribute(enhancedAttribute, "");
    schedule(entry);
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
  new MutationObserver(() => {
    for (const entry of liveEntries) schedule(entry);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "dir"],
    subtree: true,
  });
  globalThis.addEventListener("resize", () => {
    for (const entry of liveEntries) schedule(entry);
  });
})();
