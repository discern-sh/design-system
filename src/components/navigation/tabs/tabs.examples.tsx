import { useEffect, useRef } from "react";
import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./tabs.meta.ts";
import { Tabs } from "./tabs.tsx";

export const conformance = [{
  name: "arrow keys move focus and selection to the next enabled tab",
  steps: [
    { action: "focus", target: { role: "tab", name: "Overview" } },
    {
      action: "press",
      key: "ArrowRight",
      target: { role: "tab", name: "Overview" },
    },
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

export default function TabsExamples() {
  return <OverviewExample />;
}
