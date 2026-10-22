import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import { Button } from "../../core/button/button.tsx";
import { IconButton } from "../../core/icon-button/icon-button.tsx";
import meta, { componentExampleVocabulary } from "./tooltip.meta.ts";
import { Tooltip } from "./tooltip.tsx";

const focusInformation = {
  action: "focus",
  target: { role: "button", name: "Information" },
} as const;

export const conformance = [{
  example: "default",
  name: "keyboard focus reveals the described tooltip",
  steps: [
    focusInformation,
    {
      expect: "visible",
      target: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
    {
      expect: "describes",
      target: { role: "button", name: "Information" },
      description: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "hidden",
      target: { role: "tooltip", name: "Lorem ipsum dolor" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

function DefaultTooltipState() {
  return (
    <Tooltip label="Lorem ipsum dolor">
      <IconButton
        icon={<ExampleIcon name="info" />}
        label="Information"
        variant="outline"
      />
    </Tooltip>
  );
}

function BottomTooltipState() {
  return (
    <Tooltip label="Consectetur adipiscing" placement="bottom">
      <Button variant="ghost" size="sm">Focus or hover</Button>
    </Tooltip>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: DefaultTooltipState,
      capture: {
        prepare: [{ action: "focus", selector: "button" }],
        selectors: [".discern-tooltip", ".discern-tooltip__bubble"],
      },
    },
    {
      id: "bottom",
      Example: BottomTooltipState,
      capture: {
        prepare: [{ action: "focus", selector: "button" }],
        selectors: [".discern-tooltip", ".discern-tooltip__bubble"],
      },
    },
  ],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "focus-disclosure",
    label: "Focus disclosure",
    example: "default",
    category: "interaction",
    sequence: [
      focusInformation,
      { checkpoint: { id: "tooltip-disclosed", label: "Tooltip visible" } },
    ],
  }] as const,
);

export default function TooltipExamples() {
  return (
    <div className="discern-example-row">
      <DefaultTooltipState />
      <BottomTooltipState />
    </div>
  );
}
