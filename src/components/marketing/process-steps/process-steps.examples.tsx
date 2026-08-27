import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./process-steps.meta.ts";
import { ProcessSteps } from "./process-steps.tsx";

export const conformance = [
  {
    example: "default",
    name:
      "five steps share one row and keep their footers level when space permits",
    steps: [
      {
        expect: "aligned",
        target: { selector: ".discern-process-steps__list > li" },
        edge: "top",
      },
      {
        expect: "aligned",
        target: { selector: ".discern-process-steps__detail" },
        edge: "top",
      },
    ],
  },
  {
    example: "default",
    name: "five steps wrap into balanced rows before becoming a single column",
    viewport: { width: 800, height: 1000 },
    steps: [
      {
        expect: "balanced-rows",
        target: { selector: ".discern-process-steps__list > li" },
      },
    ],
  },
] satisfies readonly ConformanceScenario[];

const steps = [
  {
    title: "Connect",
    description: <p>Start with the tools and context already in place.</p>,
    detail: "Complete",
  },
  {
    title: "Shape",
    description: (
      <p>
        Turn the desired outcome into a concrete, reviewable plan with room for
        constraints, alternatives, and a clear definition of done.
      </p>
    ),
    detail: "In progress",
  },
  {
    title: "Build",
    description: <p>Carry the work through with the system close at hand.</p>,
    detail: "Waiting",
  },
  {
    title: "Prove",
    description: (
      <p>Finish with evidence someone else can independently inspect.</p>
    ),
    detail: "Waiting",
  },
  {
    title: "Share",
    description: <p>Hand the result back with its evidence attached.</p>,
    detail: "Waiting",
  },
] as const;

function DefaultProcessStepsState() {
  return (
    <ProcessSteps
      eyebrow="How it works"
      title="A clear path from input to outcome."
      description={
        <p>
          Use the sequence to make a new process feel understandable before the
          reader commits.
        </p>
      }
      steps={steps}
    />
  );
}

function ErrorProcessStepsState() {
  return (
    <ProcessSteps
      eyebrow="Review the process"
      title="Resolve the blocked step before continuing."
      description={
        <p>The highlighted correction keeps the sequence legible.</p>
      }
      steps={[
        { ...steps[0], detail: "Complete" },
        { ...steps[1], detail: "Shape needs attention" },
        { ...steps[2], detail: "Waiting" },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: DefaultProcessStepsState },
    { id: "error", Example: ErrorProcessStepsState },
  ],
);

export default function ProcessStepsExamples() {
  return <DefaultProcessStepsState />;
}
