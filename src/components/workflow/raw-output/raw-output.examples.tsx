import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { RawOutput } from "./raw-output.tsx";
import meta, { componentExampleVocabulary } from "./raw-output.meta.ts";

const collapsedOutput = "error: expected a string\nat src/example.ts:18:7";
const completeResponse = `{
  "ok": false,
  "reason": "invalid input"
}`;

const disclosure = {
  selector: "[data-example-raw-output] .discern-raw-output__summary",
} as const;
const rawOutput = {
  selector: "[data-example-raw-output]",
} as const;
const content = {
  selector: "[data-example-raw-output] .discern-raw-output__content",
} as const;

export const conformance = [{
  example: "default",
  name: "native disclosure toggles its content and open state",
  steps: [
    { expect: "hidden", target: content },
    { action: "click", target: disclosure },
    {
      expect: "attribute",
      target: rawOutput,
      attribute: "open",
      value: "",
    },
    { expect: "visible", target: content },
  ],
}] satisfies readonly ConformanceScenario[];

function CollapsedOutputState() {
  return <RawOutput data-example-raw-output>{collapsedOutput}</RawOutput>;
}

function ExpandedOutputState() {
  return (
    <RawOutput label="Complete response" open>{completeResponse}</RawOutput>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: CollapsedOutputState },
    { id: "expanded", Example: ExpandedOutputState },
  ],
);

export default function RawOutputExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <CollapsedOutputState />
      <ExpandedOutputState />
    </div>
  );
}
