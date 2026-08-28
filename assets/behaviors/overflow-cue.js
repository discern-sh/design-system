import {
  measureOverflowCueState,
  overflowCueAxes,
  overflowCueMarkupAttributes,
} from "../../src/internal/overflow-cue-state.js";

(() => {
  const rootSelector = `[${overflowCueMarkupAttributes.root}]`;
  const targetSelector = `[${overflowCueMarkupAttributes.target}]`;
  const targetAttribute = overflowCueMarkupAttributes.target;
  const enhancedAttribute = overflowCueMarkupAttributes.enhanced;
  const edgeSelector = ":scope>[data-discern-overflow-cue-edge]";
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

  const targetInsets = (entry, direction) => {
    const { root, target, edges } = entry;
    const rootBounds = root.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const [top, right, bottom, left] = [
      targetBounds.top - rootBounds.top,
      rootBounds.right - targetBounds.right,
      rootBounds.bottom - targetBounds.bottom,
      targetBounds.left - rootBounds.left,
    ].map((value) => Math.max(0, value));
    const gap = "var(--discern-space-2)";
    const size = "var(--discern-space-5)";
    const blockEdge =
      `right:calc(${right}px + ${gap});left:calc(${left}px + ${gap});height:${size};`;
    const inlineEdge =
      `top:calc(${top}px + ${gap});bottom:calc(${bottom}px + ${gap});width:${size};`;
    edges[0].style.cssText = `${blockEdge}top:${top}px`;
    edges[1].style.cssText = `${blockEdge}bottom:${bottom}px`;
    const [start, end, startAngle, endAngle] = direction === "rtl"
      ? [right, left, "to left", "to right"]
      : [left, right, "to right", "to left"];
    edges[2].style.cssText =
      `${inlineEdge}inset-inline-start:${start}px;--discern-overflow-cue-angle:${startAngle}`;
    edges[3].style.cssText =
      `${inlineEdge}inset-inline-end:${end}px;--discern-overflow-cue-angle:${endAngle}`;
  };

  const release = (entry) => {
    cancelAnimationFrame(entry.frame);
    entry.resize?.disconnect();
    liveEntries.delete(entry);
  };

  const measure = (entry) => {
    const { root, target } = entry;
    if (!root.isConnected || !target.isConnected) {
      release(entry);
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
      target,
      axis,
      detectRtlScrollType(),
      direction,
    );
    targetInsets(entry, direction);
    for (const [edge, visible] of Object.entries(state)) {
      const suffix = edge.replace(
        /[SE]/,
        (letter) => `-${letter.toLowerCase()}`,
      );
      root.setAttribute(
        `${overflowCueMarkupAttributes.root}-${suffix}`,
        visible ? "true" : "false",
      );
    }
  };

  const schedule = (entry) => {
    cancelAnimationFrame(entry.frame);
    entry.frame = requestAnimationFrame(() => measure(entry));
  };

  const observeSize = (entry) => {
    if (!entry.resize) return;
    entry.resize.disconnect();
    entry.resize.observe(entry.root);
    entry.resize.observe(entry.target);
    for (const child of entry.target.children) entry.resize.observe(child);
  };

  const enhance = (root) => {
    if (root.hasAttribute(enhancedAttribute)) return;
    const target = ownedTarget(root);
    const edges = root.querySelectorAll(edgeSelector);
    if (!(target instanceof HTMLElement) || edges.length !== 4) return;
    const entry = {
      root,
      target,
      edges,
      frame: 0,
      resize: undefined,
    };
    liveEntries.add(entry);
    target.addEventListener("scroll", () => schedule(entry), { passive: true });
    if (typeof ResizeObserver === "function") {
      entry.resize = new ResizeObserver(() => schedule(entry));
      observeSize(entry);
    }
    root.setAttribute(enhancedAttribute, "");
    schedule(entry);
  };

  const enhanceWithin = (node) => {
    if (!node.querySelectorAll) return;
    const nearestRoot = node instanceof Element && node.closest(rootSelector);
    if (nearestRoot) enhance(nearestRoot);
    for (const root of node.querySelectorAll(rootSelector)) enhance(root);
  };

  enhanceWithin(document);
  new MutationObserver((records) => {
    for (const record of records) {
      enhanceWithin(record.target);
      for (const node of record.addedNodes) enhanceWithin(node);
    }
    for (const entry of [...liveEntries]) {
      if (ownedTarget(entry.root) !== entry.target) {
        release(entry);
        entry.root.removeAttribute(enhancedAttribute);
        enhance(entry.root);
        continue;
      }
      observeSize(entry);
      schedule(entry);
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "dir", "hidden", targetAttribute],
    characterData: true,
    childList: true,
    subtree: true,
  });
})();
