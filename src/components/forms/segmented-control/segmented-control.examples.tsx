import { useId, useState } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./segmented-control.meta.ts";
import { SegmentedControl } from "./segmented-control.tsx";

const items = [{ value: "list", label: "List" }, {
  value: "grid",
  label: "Grid",
}, { value: "timeline", label: "Timeline", disabled: true }] as const;
function DefaultState() {
  const name = useId();
  return <SegmentedControl label="View" name={name} items={items} />;
}
function LongLabels() {
  const name = useId();
  return (
    <SegmentedControl
      label="Processing policy"
      name={name}
      items={[{ value: "all", label: "Process every available item" }, {
        value: "new",
        label: "Process only newly added items",
      }, { value: "changed", label: "Process items with changes" }]}
      defaultValue="new"
    />
  );
}
function Icons() {
  const name = useId();
  const [value, setValue] = useState("grid");
  return (
    <SegmentedControl
      label="Layout"
      name={name}
      items={[{ value: "list", label: "List", icon: "☷" }, {
        value: "grid",
        label: "Grid",
        icon: "▦",
      }]}
      value={value}
      onValueChange={setValue}
    />
  );
}
function Disabled() {
  const name = useId();
  return (
    <SegmentedControl
      label="View"
      name={name}
      items={items}
      defaultValue="grid"
      disabled
    />
  );
}
export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultState },
    { id: "long-labels", Example: LongLabels },
    { id: "icons", Example: Icons },
    { id: "disabled", Example: Disabled },
  ],
);
export const conformance: readonly ConformanceScenario[] = [{
  example: "default",
  name: "Native peer selection skips disabled options",
  steps: [
    { action: "focus", target: { role: "radio", name: "List" } },
    { action: "press", key: "ArrowRight" },
    { expect: "focused", target: { role: "radio", name: "Grid" } },
    {
      expect: "visible",
      target: {
        selector:
          'input[value="grid"]:checked + .discern-segmented-control__surface',
      },
    },
    { action: "press", key: "ArrowRight" },
    { expect: "focused", target: { role: "radio", name: "List" } },
  ],
}, {
  example: "icons",
  name: "Controlled adapter updates the supplied selection",
  steps: [
    { action: "click", target: { role: "radio", name: "List" } },
    {
      expect: "visible",
      target: {
        selector:
          'input[value="list"]:checked + .discern-segmented-control__surface',
      },
    },
    { action: "press", key: "ArrowRight" },
    {
      expect: "visible",
      target: {
        selector:
          'input[value="grid"]:checked + .discern-segmented-control__surface',
      },
    },
  ],
}];
export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "keyboard",
      label: "Selected option with keyboard focus",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "focus", target: { selector: 'input[value="list"]' } },
        {
          checkpoint: {
            id: "keyboard-selected",
            label: "Initial selection focused",
          },
        },
      ],
    },
    {
      id: "pointer",
      label: "Hover and pointer contact",
      example: "default",
      category: "interaction",
      sequence: [
        { action: "hover", target: { selector: 'input[value="grid"]' } },
        { checkpoint: { id: "hover", label: "Hover over Grid" } },
        { action: "pointer-down", target: { selector: 'input[value="grid"]' } },
        { checkpoint: { id: "contact", label: "Pointer held" } },
        { action: "pointer-up", target: { selector: 'input[value="grid"]' } },
        { action: "click", target: { selector: 'input[value="grid"]' } },
        { checkpoint: { id: "pointer-selected", label: "Grid selected" } },
      ],
    },
    {
      id: "narrow",
      label: "Long labels in a narrow allocation",
      example: "long-labels",
      category: "responsive",
      requirements: { inlineSize: 260 },
      sequence: [{
        checkpoint: { id: "local-narrow", label: "Stacked peer choices" },
      }],
    },
  ],
);
export default DefaultState;
