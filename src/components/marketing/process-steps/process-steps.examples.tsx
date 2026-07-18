import { ProcessSteps } from "./process-steps.tsx";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";

export const conformance = [
  {
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

export default function ProcessStepsExamples() {
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
      steps={[
        {
          title: "Connect",
          description: (
            <p>
              Start with the tools and context already in place.
            </p>
          ),
          detail: "Two-minute setup",
        },
        {
          title: "Shape",
          description: (
            <p>
              Turn the desired outcome into a concrete, reviewable plan with
              room for constraints, alternatives, and a clear definition of
              done.
            </p>
          ),
          detail: "Clear defaults",
        },
        {
          title: "Build",
          description: (
            <p>Carry the work through with the system close at hand.</p>
          ),
          detail: "No stack lock-in",
        },
        {
          title: "Prove",
          description: (
            <p>Finish with evidence someone else can independently inspect.</p>
          ),
          detail: "Permanent receipt",
        },
        {
          title: "Share",
          description: <p>Hand the result back with its evidence attached.</p>,
          detail: "Ready for review",
        },
      ]}
    />
  );
}
