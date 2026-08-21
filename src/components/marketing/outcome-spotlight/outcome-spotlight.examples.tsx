import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { OutcomeSpotlight } from "./outcome-spotlight.tsx";

function FocusedOutcomeState() {
  return (
    <OutcomeSpotlight
      eyebrow="Prove"
      title="Let one result carry the section."
      description={
        <p>
          Supporting facts remain available, but the reader is never asked to
          decide which of several competing numbers matters most.
        </p>
      }
      value="1"
      valueLabel="clear outcome to remember after the details have faded."
      supporting={[
        { value: "3", label: "supporting facts at most" },
        { value: "0", label: "extra panels to interpret" },
        { value: "1", label: "obvious next question" },
      ]}
    />
  );
}

function TextualOutcomeState() {
  return (
    <OutcomeSpotlight
      eyebrow="A qualitative result"
      title="The outcome does not have to be numerical."
      value="Less to parse"
      valueLabel="A short phrase can carry the evidence when a number would be artificial."
      surface="sunken"
    />
  );
}

export const catalogueStates = [
  {
    name: "focused",
    label: "Focused outcome",
    Example: FocusedOutcomeState,
  },
  {
    name: "textual",
    label: "Textual outcome",
    Example: TextualOutcomeState,
  },
] satisfies readonly CatalogueExampleState[];

export default function OutcomeSpotlightExamples() {
  return (
    <div className="discern-example-stack">
      <FocusedOutcomeState />
      <TextualOutcomeState />
    </div>
  );
}
