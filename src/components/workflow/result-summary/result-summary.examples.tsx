import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../catalogue/conformance.ts";
import { ResultSummary, type ResultSummaryProps } from "./result-summary.tsx";
import {
  RESULT_SUMMARY_STATE_LABELS,
  RESULT_SUMMARY_STATES,
  type ResultSummaryState,
} from "./result-summary.types.ts";

const copyTarget = {
  selector: "[data-example-result-copy] .discern-copy-button",
} as const;

export const conformance = [{
  name: "machine-readable copy announces completion without moving focus",
  steps: [
    { action: "focus", target: copyTarget },
    { action: "press", key: "Enter", target: copyTarget },
    {
      expect: "attribute",
      target: copyTarget,
      attribute: "data-discern-copied",
      value: "",
    },
    {
      expect: "attribute",
      target: {
        selector:
          '[data-example-result-copy] .discern-copy-button [aria-live="polite"]',
      },
      attribute: "aria-live",
      value: "polite",
    },
    { expect: "focused", target: copyTarget },
  ],
}] satisfies readonly ConformanceScenario[];

const resultSummaryExamples = {
  passed: {
    state: "passed",
    fact: "All configured checks completed successfully.",
    counts: [
      { label: "Checks", value: "12" },
      { label: "Files", value: "8" },
      { label: "Findings", value: "0" },
    ],
    duration: <time dateTime="PT48S">48 s</time>,
    nextAction: "Review the recorded changes before continuing.",
    machineReadable: '{"ok":true,"checks":12,"files":8,"findings":0}',
  },
  failed: {
    state: "failed",
    fact: "Two checks did not complete.",
    counts: [
      { label: "Passed", value: "10" },
      { label: "Failed", value: "2" },
    ],
    nextAction: "Open the first diagnostic and reproduce the failure.",
  },
  blocked: {
    state: "blocked",
    fact: "The run stopped because a required credential is unavailable.",
    nextAction: "Provide the credential, then retry the run.",
  },
  changed: {
    state: "changed",
    fact: "Formatting updated three files.",
    counts: [{ label: "Files", value: "3" }],
    duration: <time dateTime="PT2S">2 s</time>,
  },
  declared: {
    state: "declared",
    fact: "The reviewer declared the condition met.",
    nextAction: "Continue with the recorded judgment.",
  },
  unchanged: {
    state: "unchanged",
    fact: "No tracked files changed.",
    nextAction: "Continue with the next planned check.",
  },
} satisfies Readonly<Record<ResultSummaryState, ResultSummaryProps>>;

function ResultSummaryStateExample(
  { state }: { readonly state: ResultSummaryState },
) {
  return (
    <ResultSummary
      {...resultSummaryExamples[state]}
      data-example-result-copy={state === "passed" ? "" : undefined}
    />
  );
}

export const catalogueStates = RESULT_SUMMARY_STATES.map((state) => ({
  name: state,
  label: RESULT_SUMMARY_STATE_LABELS[state],
  Example: () => <ResultSummaryStateExample state={state} />,
})) satisfies readonly CatalogueExampleState[];

export default function ResultSummaryExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      {RESULT_SUMMARY_STATES.map((state) => (
        <ResultSummaryStateExample key={state} state={state} />
      ))}
    </div>
  );
}
