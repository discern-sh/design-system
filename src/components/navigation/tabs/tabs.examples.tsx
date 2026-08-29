import { useEffect, useRef } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./tabs.meta.ts";
import { Tabs } from "./tabs.tsx";

const focusOverview = {
  action: "focus",
  target: { role: "tab", name: "Overview" },
} as const;
const selectDetailsByKeyboard = {
  action: "press",
  key: "ArrowRight",
  target: { role: "tab", name: "Overview" },
} as const;

export const conformance = [{
  example: "default",
  name: "arrow keys move focus and selection to the next enabled tab",
  steps: [
    focusOverview,
    selectDetailsByKeyboard,
    { expect: "focused", target: { role: "tab", name: "Details" } },
    {
      expect: "attribute",
      target: { role: "tab", name: "Details" },
      attribute: "aria-selected",
      value: "true",
    },
    { expect: "visible", target: { role: "tabpanel", name: "Details" } },
  ],
}] satisfies readonly ConformanceScenario[];

const items = [{
  value: "overview",
  label: "Overview",
  content: <p>Summary content.</p>,
}, {
  value: "details",
  label: "Details",
  content: <p>Detailed content.</p>,
}, {
  value: "history",
  label: "History",
  content: null,
  disabled: true,
}] as const;

function OverviewExample() {
  return <Tabs label="Example sections" items={items} />;
}

function DetailsExample() {
  return <Tabs label="Example sections" items={items} defaultValue="details" />;
}

function ManualActivationExample() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]
      ?.focus();
  }, []);
  return (
    <Tabs
      ref={rootRef}
      label="Example sections"
      items={items}
      activationMode="manual"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: OverviewExample },
    { id: "details", Example: DetailsExample },
    { id: "manual", Example: ManualActivationExample },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "pointer-selection",
      label: "Pointer selection",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "click", target: { role: "tab", name: "Details" } },
        {
          checkpoint: {
            id: "tabs-pointer-selected",
            label: "Details selected",
          },
        },
      ],
    },
    {
      id: "keyboard-selection",
      label: "Keyboard selection",
      example: "default",
      category: "interaction",
      sequence: [
        focusOverview,
        selectDetailsByKeyboard,
        {
          checkpoint: {
            id: "tabs-keyboard-selected",
            label: "Details selected",
          },
        },
      ],
    },
    {
      id: "press-tab",
      label: "Tab pointer contact",
      example: "default",
      category: "interaction",
      sequence: [
        {
          action: "pointer-down",
          target: { role: "tab", name: "Details" },
        },
        {
          checkpoint: {
            id: "tabs-pointer-pressed",
            label: "Pointer held",
          },
        },
        {
          action: "pointer-up",
          target: { role: "tab", name: "Details" },
        },
      ],
    },
  ] as const,
);

export default function TabsExamples() {
  return <OverviewExample />;
}
