import { useState } from "react";
import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { ThemeToggle } from "./theme-toggle.tsx";
import type { ThemeToggleTheme } from "./theme-toggle.types.ts";

export const conformance = [{
  name: "the toggle always names its destination theme",
  steps: [
    {
      action: "click",
      target: { role: "button", name: "Switch to the dark theme" },
    },
    {
      expect: "attribute",
      target: { role: "button", name: "Switch to the light theme" },
      attribute: "aria-label",
      value: "Switch to the light theme",
    },
    {
      action: "click",
      target: { role: "button", name: "Switch to the light theme" },
    },
    {
      expect: "attribute",
      target: { role: "button", name: "Switch to the dark theme" },
      attribute: "aria-label",
      value: "Switch to the dark theme",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ThemeToggleExamples() {
  const [theme, setTheme] = useState<ThemeToggleTheme>("light");
  return (
    <div className="discern-example-row">
      <ThemeToggle theme={theme} onThemeChange={setTheme} />
    </div>
  );
}
