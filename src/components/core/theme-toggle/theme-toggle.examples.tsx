import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { ThemeToggle } from "./theme-toggle.tsx";
import type { ThemeToggleTheme } from "./theme-toggle.tsx";

export const conformance = [{
  name: "every toggle variant names the destination theme",
  steps: [
    {
      action: "click",
      target: {
        selector: ".discern-theme-toggle:not(.discern-theme-toggle--quiet)",
      },
    },
    {
      expect: "attribute",
      target: {
        selector: ".discern-theme-toggle:not(.discern-theme-toggle--quiet)",
      },
      attribute: "aria-label",
      value: "Switch to the light theme",
    },
    {
      expect: "attribute",
      target: { selector: ".discern-theme-toggle--quiet" },
      attribute: "aria-label",
      value: "Switch to the light theme",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ThemeToggleExamples() {
  const [theme, setTheme] = useState<ThemeToggleTheme>("light");
  return (
    <div className="discern-example-row">
      <ThemeToggle theme={theme} onThemeChange={setTheme} />
      <ThemeToggle
        theme={theme}
        variant="quiet"
        onThemeChange={setTheme}
      />
      <span>Lorem ipsum: the {theme} theme is selected.</span>
    </div>
  );
}
