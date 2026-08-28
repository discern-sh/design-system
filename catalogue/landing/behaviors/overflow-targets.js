(() => {
  const selectors = {
    "code-listing": ".discern-code-listing__body",
    diagram: ".discern-diagram__viewport",
    terminal: ".discern-terminal__body",
  };

  const enhance = () => {
    for (
      const root of document.querySelectorAll(
        "[data-discern-landing-overflow-target]",
      )
    ) {
      const selector = selectors[root.dataset.discernLandingOverflowTarget];
      const target = selector ? root.querySelector(selector) : null;
      target?.setAttribute("data-discern-overflow-cue-target", "");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance, { once: true });
  } else {
    enhance();
  }
})();
