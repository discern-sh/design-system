import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import meta, { componentExampleVocabulary } from "./feature-bento.meta.ts";
import { FeatureBento } from "./feature-bento.tsx";

const visual = (items: readonly string[]) => (
  <ul
    style={{
      padding: "var(--discern-space-6)",
      margin: 0,
      color: "var(--discern-color-ink-muted)",
    }}
  >
    {items.map((item) => <li key={item}>{item}</li>)}
  </ul>
);

export const conformance = [{
  example: "lead-matrix",
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
      eyebrow="Workshop preparation"
      title="Make room for a useful conversation."
      description={
        <p>
          Choose a question, gather the material, and agree how the group will
          make a decision.
        </p>
      }
      items={[
        {
          title: "Start with the question",
          description: (
            <p>
              Write the decision in one sentence. Share what is known and what
              still needs discussion.
            </p>
          ),
          icon: <ExampleIcon name="spark" />,
          visual: visual([
            "What are we deciding?",
            "Which constraints matter?",
            "Who needs to be involved?",
          ]),
          size: "large",
          tone: "accent",
        },
        {
          title: "Bring the evidence",
          description: (
            <p>
              Attach the notes that help people prepare. Keep assumptions
              separate from observations.
            </p>
          ),
          icon: <ExampleIcon name="check" />,
          visual: visual([
            "Research notes",
            "Open questions",
            "Decision criteria",
          ]),
          size: "wide",
        },
        {
          title: "Name a facilitator",
          description: (
            <p>
              Ask one person to guide the discussion and make space for quieter
              voices.
            </p>
          ),
        },
        {
          title: "Record the next step",
          description: (
            <p>
              Write down the action, its owner, and when the group will review
              it.
            </p>
          ),
        },
      ]}
    />
  );
}

function VerticalMatrixState() {
  return (
    <FeatureBento
      eyebrow="Ways to take part"
      title="Prepare together, even when you work apart."
      description={
        <p>
          Use the same question and decision record for both live and written
          contributions.
        </p>
      }
      items={[
        {
          title: "In the room",
          description: (
            <p>
              Read the question before the session. Use individual reflection
              before opening the discussion.
            </p>
          ),
          visual: visual([
            "Read the brief",
            "Make private notes",
            "Compare viewpoints",
          ]),
          size: "tall",
        },
        {
          title: "In your own time",
          description: (
            <p>
              Leave a written response before the decision date. Link supporting
              material so others can follow your reasoning.
            </p>
          ),
          visual: visual([
            "Read the same brief",
            "Add a written response",
            "Flag unanswered questions",
          ]),
          size: "tall",
          tone: "sunken",
        },
        {
          title: "One decision record",
          description: (
            <p>
              Keep the question, options considered, and reasons for the choice
              together. Include unresolved concerns and an owner for the next
              review.
            </p>
          ),
          visual: visual([
            "Decision and rationale",
            "Remaining uncertainty",
            "Owner and review date",
          ]),
          size: "large",
          tone: "accent",
        },
      ]}
    />
  );
}

function CopyLedMatrixState() {
  return (
    <FeatureBento
      eyebrow="How the session runs"
      title="A short agenda keeps the discussion moving."
      items={[
        {
          title: "Open with the question",
          description: (
            <>
              <p>
                Read the decision aloud and confirm everyone understands what is
                in scope before anyone argues for an option.
              </p>
              <p>
                Note the constraints the group already agreed, so the discussion
                spends its time on the choices that remain.
              </p>
            </>
          ),
          icon: <ExampleIcon name="spark" />,
          size: "large",
          tone: "accent",
          align: "end",
        },
        {
          title: "Hear every viewpoint",
          description: (
            <p>
              Go around the group once before debate begins, so quieter
              contributors are heard early.
            </p>
          ),
          icon: <ExampleIcon name="info" />,
          size: "wide",
        },
        {
          title: "Compare the options",
          description: <p>Weigh each option against the agreed criteria.</p>,
          icon: <ExampleIcon name="arrow" />,
        },
        {
          title: "Decide",
          description: (
            <p>State the choice and the reason for it in one sentence.</p>
          ),
          icon: <ExampleIcon name="check" />,
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "lead-matrix", Example: LeadMatrixState },
    { id: "vertical-matrix", Example: VerticalMatrixState },
    { id: "copy-led-matrix", Example: CopyLedMatrixState },
  ],
);

export default function FeatureBentoExamples() {
  return <LeadMatrixState />;
}
