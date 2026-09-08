(() => {
  const key = Symbol.for("discern.article-navigation");
  if (document[key]) return;
  document[key] = true;

  const fragmentId = (hash) => {
    try {
      return decodeURIComponent(hash.slice(1));
    } catch {
      return hash.slice(1);
    }
  };
  const restoreFocus = () => {
    const id = fragmentId(location.hash);
    const target = id && document.getElementById(id);
    if (
      !target || !target.closest("[data-discern-root]") ||
      target.closest("[inert], [hidden]") || !target.getClientRects().length
    ) return;
    const inArticle = target.closest(
      ".discern-prose, .discern-article-layout, .discern-anchor-heading, .discern-footnotes",
    );
    const isReturn = !inArticle && [...document.querySelectorAll(
      '[data-discern-root] .discern-footnotes a[href^="#"]',
    )].some((link) => fragmentId(link.getAttribute("href")) === id);
    if (inArticle || isReturn) {
      target.focus?.({ preventScroll: true });
      target.scrollIntoView({ block: "nearest" });
    }
  };

  // Keep native URLs and history. Nested scrollers may retain the previous
  // position on traversal; nearest scrolling respects each container's padding.
  addEventListener("hashchange", restoreFocus);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreFocus, { once: true });
  } else {
    restoreFocus();
  }
})();
