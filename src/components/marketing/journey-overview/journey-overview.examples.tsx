import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { JourneyOverview } from "./journey-overview.tsx";

const overviewSteps = [
  {
    title: "Begin with the outcome",
    description: (
      <p>State what should become possible before introducing the method.</p>
    ),
    outcome: <span>The reader knows where the journey leads.</span>,
  },
  {
    title: "Make the change legible",
    description: (
      <p>Show the few moments that materially alter the experience.</p>
    ),
    outcome: <span>The route feels finite and understandable.</span>,
  },
  {
    title: "Return with confidence",
    description: (
      <p>End on the evidence or decision the audience actually needs.</p>
    ),
    outcome: <span>The process resolves instead of merely stopping.</span>,
  },
] as const;

function ThreeStepState() {
  return (
    <JourneyOverview
      eyebrow="Demonstrate"
      title="Show the journey without reproducing the machinery."
      description={
        <p>
          Three plain-language moments can explain a transformation more clearly
          than a complete operational transcript.
        </p>
      }
      steps={overviewSteps}
    />
  );
}

function CompactState() {
  return (
    <JourneyOverview
      eyebrow="A short sequence"
      title="Two moments can still form a complete story."
      steps={overviewSteps.slice(0, 2)}
      surface="sunken"
    />
  );
}

export const catalogueStates = [
  {
    name: "three-step",
    label: "Three moments",
    Example: ThreeStepState,
  },
  {
    name: "compact",
    label: "Compact sequence",
    Example: CompactState,
  },
] satisfies readonly CatalogueExampleState[];

export default function JourneyOverviewExamples() {
  return (
    <div className="discern-example-stack">
      <ThreeStepState />
      <CompactState />
    </div>
  );
}
