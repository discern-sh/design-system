import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { ThemeSwitcher } from "./theme-switcher.tsx";
import type { ThemeSwitcherMode } from "./theme-switcher.tsx";

export const conformance = [{
  name: "each labelled choice updates the controlled preference",
  steps: [
    {
      action: "click",
      target: { role: "radio", name: "Dark" },
    },
    {
      expect: "attribute",
      target: { selector: ".discern-theme-switcher" },
      attribute: "data-discern-mode",
      value: "dark",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ThemeSwitcherExamples() {
  const [mode, setMode] = useState<ThemeSwitcherMode>("system");
  return (
    <div className="discern-example-row">
      <ThemeSwitcher mode={mode} onModeChange={setMode} />
      <span>Lorem ipsum: the {mode} preference is selected.</span>
    </div>
  );
}
