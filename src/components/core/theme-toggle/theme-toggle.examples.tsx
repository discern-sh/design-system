import { useState } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./theme-toggle.meta.ts";
import { ThemeToggle } from "./theme-toggle.tsx";
import type {
  ThemeToggleTheme,
  ThemeToggleVariant,
} from "./theme-toggle.types.ts";

export const conformance = [{
  example: "default",
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

function ToggleExample(
  { initialTheme, variant }: {
    initialTheme: ThemeToggleTheme;
    variant?: ThemeToggleVariant;
  },
) {
  const [theme, setTheme] = useState<ThemeToggleTheme>(initialTheme);
  return (
    <div className="discern-example-row">
      <ThemeToggle
        theme={theme}
        onThemeChange={setTheme}
        {...(variant === undefined ? {} : { variant })}
      />
    </div>
  );
}

function FromLightExample() {
  return <ToggleExample initialTheme="light" />;
}

function FromDarkExample() {
  return <ToggleExample initialTheme="dark" />;
}

function QuietExample() {
  return <ToggleExample initialTheme="dark" variant="quiet" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: FromLightExample },
    { id: "quiet", Example: QuietExample },
    { id: "from-dark", Example: FromDarkExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-theme-toggle",
    label: "Pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { role: "button", name: "Switch to the dark theme" },
      },
      {
        checkpoint: {
          id: "theme-toggle-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { role: "button", name: "Switch to the dark theme" },
      },
    ],
  }] as const,
);

export default function ThemeToggleExamples() {
  return <FromLightExample />;
}
