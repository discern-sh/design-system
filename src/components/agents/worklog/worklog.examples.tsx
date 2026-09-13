import { denseWorklogEntries } from "../operational-examples.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Worklog } from "./worklog.tsx";
import meta, { componentExampleVocabulary } from "./worklog.meta.ts";

const worklogCapture = {
  selectors: [".discern-worklog"],
  // Entry connectors escape their rows but remain inside the Worklog allocation.
  paintBleed: 0,
} as const;

function ActiveRunState() {
  return (
    <Worklog
      style={{ maxWidth: "26rem" }}
      entries={[
        { label: "Generate registry", status: "done", meta: "120ms" },
        {
          label: "Run exact-frame tests",
          status: "active",
          detail: "Testing every capability level.",
        },
        { label: "Hand off for review", status: "queued" },
      ]}
    />
  );
}

function FailedRunState() {
  return (
    <Worklog
      style={{ maxWidth: "26rem" }}
      entries={[
        { label: "Format and build", status: "done", meta: "11s" },
        {
          label: "Run the test suite",
          status: "failed",
          detail: "2 of 184 cases failing",
          meta: "38s",
        },
        { label: "Publish the preview", status: "skipped" },
      ]}
    />
  );
}

function DenseState() {
  return <Worklog entries={denseWorklogEntries} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ActiveRunState, capture: worklogCapture },
    { id: "failure", Example: FailedRunState, capture: worklogCapture },
    { id: "dense", Example: DenseState, capture: worklogCapture },
  ],
);

export default function WorklogExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ActiveRunState />
      <FailedRunState />
    </div>
  );
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    ...(["narrow", "wide"] as const).map((inlineSize) => ({
      id: `dense-${inlineSize}`,
      label: `Dense evidence at ${inlineSize} width`,
      example: "dense",
      category: "responsive" as const,
      requirements: { inlineSize },
      sequence: [{
        checkpoint: {
          id: `dense-${inlineSize}-reading`,
          label: "Outcome, identity and boundaries",
        },
      }],
    })),
  ],
);
