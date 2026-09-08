import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./journey-overview.meta.ts";
import { JourneyOverview } from "./journey-overview.tsx";

const overviewSteps = [
  {
    title: "Prepare the question",
    description: (
      <p>
        Write what the group needs to decide and share the relevant reading.
      </p>
    ),
    outcome: <span>A brief everyone can prepare from.</span>,
  },
  {
    title: "Compare the options",
    description: (
      <p>
        Give people time to think privately, then discuss the differences in
        evidence and assumptions.
      </p>
    ),
    outcome: <span>Reasons for a choice, with uncertainty recorded.</span>,
  },
  {
    title: "Record the next step",
    description: (
      <p>Name the action, its owner, and a date to review the result.</p>
    ),
    outcome: <span>A decision the group can act on.</span>,
  },
] as const;

function ThreeStepState() {
  return (
    <JourneyOverview
      eyebrow="A workshop sequence"
      title="Move from a question to a shared next step."
      description={
        <p>
          Use this sequence to structure the conversation. Allow more time when
          people need additional context or have different starting points.
        </p>
      }
      steps={overviewSteps}
    />
  );
}

function CompactState() {
  return (
    <JourneyOverview
      eyebrow="Before the decision"
      title="Prepare first, then compare what you found."
      steps={overviewSteps.slice(0, 2)}
      surface="sunken"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "three-step", Example: ThreeStepState },
    { id: "compact", Example: CompactState },
  ],
);

export default function JourneyOverviewExamples() {
  return (
    <div className="discern-example-stack">
      <ThreeStepState />
      <CompactState />
    </div>
  );
}
