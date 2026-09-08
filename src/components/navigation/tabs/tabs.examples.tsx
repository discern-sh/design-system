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
}, {
  example: "manual",
  name: "manual focus waits for explicit activation",
  steps: [
    focusOverview,
    selectDetailsByKeyboard,
    { expect: "focused", target: { role: "tab", name: "Details" } },
    {
      expect: "attribute",
      target: { role: "tab", name: "Details" },
      attribute: "aria-selected",
      value: "false",
    },
    { expect: "visible", target: { role: "tabpanel", name: "Overview" } },
    { action: "press", key: "Enter", target: { role: "tab", name: "Details" } },
    { expect: "visible", target: { role: "tabpanel", name: "Details" } },
  ],
}, {
  example: "crowded",
  name: "wrapped tabs keep full names and boundary keyboard selection",
  steps: [
    {
      action: "focus",
      target: { role: "tab", name: "Publication history and correspondence" },
    },
    { action: "press", key: "Home" },
    {
      expect: "focused",
      target: { role: "tab", name: "Overview and responsibilities" },
    },
    {
      expect: "attribute",
      target: { role: "tab", name: "Overview and responsibilities" },
      attribute: "aria-selected",
      value: "true",
    },
    { action: "press", key: "End" },
    {
      expect: "focused",
      target: { role: "tab", name: "Publication history and correspondence" },
    },
    {
      expect: "visible",
      target: {
        role: "tabpanel",
        name: "Publication history and correspondence",
      },
    },
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
  return (
    <Tabs
      label="Example sections"
      items={items}
      activationMode="manual"
    />
  );
}

const tabsCapture = {
  selectors: [".discern-tabs"],
  paintBleed: 1,
} as const;

function CrowdedExample() {
  return (
    <Tabs
      label="Research sections"
      defaultValue="history"
      items={[
        {
          value: "overview",
          label: "Overview and responsibilities",
          content: <p>Summary content.</p>,
        },
        {
          value: "details",
          label: "Research across several regions",
          content: <p>Detailed content.</p>,
        },
        {
          value: "history",
          label: "Publication history and correspondence",
          content: <p>Read the publication archive.</p>,
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: OverviewExample,
      capture: tabsCapture,
    },
    { id: "details", Example: DetailsExample, capture: tabsCapture },
    { id: "manual", Example: ManualActivationExample, capture: tabsCapture },
    { id: "crowded", Example: CrowdedExample, capture: tabsCapture },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "narrow-content",
      label: "Full content at narrow local width",
      example: "crowded",
      category: "responsive",
      requirements: { inlineSize: 240 },
      sequence: [{
        checkpoint: {
          id: "tabs-narrow-content",
          label: "Names, current state, and actions remain visible",
        },
      }],
    },
    {
      id: "manual-focus",
      label: "Manual focus before activation",
      example: "manual",
      category: "interaction",
      sequence: [
        { action: "focus", target: { role: "tab", name: "Details" } },
        {
          checkpoint: {
            id: "tabs-manual-focused",
            label: "Details focused; Overview selected",
          },
        },
      ],
    },
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
