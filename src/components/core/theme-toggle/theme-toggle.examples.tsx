import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { ThemeToggle } from "./theme-toggle.tsx";
import type { ThemeToggleTheme } from "./theme-toggle.tsx";

export const conformance = [{
  name: "the toggle's accessible name always states the destination theme",
  steps: [
    {
      action: "click",
      target: { role: "button", name: "Switch to the dark theme" },
    },
    {
      expect: "visible",
      target: { role: "button", name: "Switch to the light theme" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ThemeToggleExamples() {
  const [theme, setTheme] = useState<ThemeToggleTheme>("light");
  return (
    <div className="discern-example-row">
      <ThemeToggle theme={theme} onThemeChange={setTheme} />
      <span>Lorem ipsum: the {theme} theme is selected.</span>
    </div>
  );
}
