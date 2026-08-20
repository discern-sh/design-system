import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import { FeatureBento } from "./feature-bento.tsx";

const visual = (label: string) => (
  <span
    style={{
      color: "var(--discern-color-ink-faint)",
    }}
  >
    {label}
  </span>
);

export const conformance = [{
  name: "the lead matrix retains complete populated rows",
  viewport: { width: 1280, height: 1000 },
  steps: [{
    expect: "balanced-rows",
    target: {
      selector:
        "[data-example-feature-bento-lead] .discern-feature-bento__item",
    },
  }],
}] satisfies readonly ConformanceScenario[];

function LeadMatrixState() {
  return (
    <FeatureBento
      data-example-feature-bento-lead
      eyebrow="Capabilities"
      title="Show the system, not a list of claims."
      description={
        <p>
          Give major ideas room and let supporting details fill the rhythm
          around them.
        </p>
      }
      items={[
        {
          title: "A wide product story",
          description: (
            <p>
              Pair a concise outcome with a substantial interface or diagram.
            </p>
          ),
          icon: <ExampleIcon name="spark" />,
          visual: visual("primary product visual"),
          size: "large",
          tone: "accent",
        },
        {
          title: "A focused detail",
          description: (
            <p>Use a smaller tile for one useful supporting capability.</p>
          ),
          icon: <ExampleIcon name="check" />,
          visual: visual("focused detail"),
          size: "wide",
        },
        {
          title: "A second dimension",
          description: (
            <p>
              Compact tiles complete the matrix without weakening the primary
              story.
            </p>
          ),
        },
        {
          title: "A final proof point",
          description: (
            <p>Complete the composition with another compact, specific idea.</p>
          ),
          visual: visual("supporting proof"),
        },
      ]}
    />
  );
}

function VerticalMatrixState() {
  return (
    <FeatureBento
      eyebrow="Perspectives"
      title="Give each viewpoint a deliberate footprint."
      description={<p>Pair two vertical narratives with one broad anchor.</p>}
      items={[
        {
          title: "First viewpoint",
          description: <p>A tall tile carries a longer visual sequence.</p>,
          visual: visual("vertical evidence"),
          size: "tall",
        },
        {
          title: "Second viewpoint",
          description: (
            <p>
              A matching footprint keeps the comparison legible.
            </p>
          ),
          visual: visual("parallel evidence"),
          size: "tall",
          tone: "sunken",
        },
        {
          title: "Shared conclusion",
          description: <p>A large tile closes the complete matrix.</p>,
          visual: visual("combined outcome"),
          size: "large",
          tone: "accent",
        },
      ]}
    />
  );
}

export const catalogueStates = [
  { name: "lead-matrix", label: "Lead matrix", Example: LeadMatrixState },
  {
    name: "vertical-matrix",
    label: "Vertical matrix",
    Example: VerticalMatrixState,
  },
] satisfies readonly CatalogueExampleState[];

export default function FeatureBentoExamples() {
  return <LeadMatrixState />;
}
