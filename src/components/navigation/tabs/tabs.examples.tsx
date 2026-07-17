import { fixtureCopy } from "../../../fixtures/content.ts";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Tabs } from "./tabs.tsx";

export const conformance = [{
  name: "arrow keys move focus and selection to the next enabled tab",
  steps: [
    { action: "focus", target: { role: "tab", name: "Lorem" } },
    {
      action: "press",
      key: "ArrowRight",
      target: { role: "tab", name: "Lorem" },
    },
    { expect: "focused", target: { role: "tab", name: "Ipsum" } },
    {
      expect: "attribute",
      target: { role: "tab", name: "Ipsum" },
      attribute: "aria-selected",
      value: "true",
    },
    { expect: "visible", target: { role: "tabpanel", name: "Ipsum" } },
  ],
}] satisfies readonly ConformanceScenario[];

export default function TabsExamples() {
  return (
    <Tabs
      label="Example sections"
      items={[{
        value: "one",
        label: "Lorem",
        content: <p>{fixtureCopy.paragraph}</p>,
      }, {
        value: "two",
        label: "Ipsum",
        content: <p>{fixtureCopy.paragraphLong}</p>,
      }, { value: "three", label: "Disabled", content: null, disabled: true }]}
    />
  );
}
