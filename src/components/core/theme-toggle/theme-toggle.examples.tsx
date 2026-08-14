import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { ThemeToggle } from "./theme-toggle.tsx";
import type { ThemeToggleTheme } from "./theme-toggle.types.ts";

export const conformance = [{
  name: "every variant names its destination and can return to system",
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
    {
      action: "click",
      target: { selector: ".discern-theme-toggle--quiet" },
    },
    {
      expect: "attribute",
      target: { selector: ".discern-example-row" },
      attribute: "data-discern-theme-preference",
      value: "system",
    },
    {
      expect: "attribute",
      target: { selector: ".discern-theme-toggle--quiet" },
      attribute: "aria-label",
      value: "Switch to the dark theme",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ThemeToggleExamples() {
  const systemTheme: ThemeToggleTheme = "light";
  const [themeOverride, setThemeOverride] = useState<
    ThemeToggleTheme | undefined
  >();
  const theme = themeOverride ?? systemTheme;
  const changeTheme = (next: ThemeToggleTheme): void => {
    setThemeOverride(next === systemTheme ? undefined : next);
  };
  return (
    <div
      className="discern-example-row"
      data-discern-theme-preference={themeOverride ?? "system"}
    >
      <ThemeToggle theme={theme} onThemeChange={changeTheme} />
      <ThemeToggle
        theme={theme}
        variant="quiet"
        onThemeChange={changeTheme}
      />
      <span>
        Lorem ipsum: {theme} is resolved; {themeOverride === undefined
          ? "following the system"
          : `${themeOverride} override stored`}.
      </span>
    </div>
  );
}
