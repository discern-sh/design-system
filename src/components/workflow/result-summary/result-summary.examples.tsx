import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { ResultSummary } from "./result-summary.tsx";

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

export default function ResultSummaryExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ResultSummary
        state="passed"
        fact="All configured checks completed successfully."
        counts={[
          { label: "Checks", value: "12" },
          { label: "Files", value: "8" },
          { label: "Findings", value: "0" },
        ]}
        duration={<time dateTime="PT48S">48 s</time>}
        nextAction="Review the recorded changes before continuing."
        machineReadable='{"ok":true,"checks":12,"files":8,"findings":0}'
        data-example-result-copy
      />
      <ResultSummary
        state="failed"
        fact="Two checks did not complete."
        counts={[
          { label: "Passed", value: "10" },
          { label: "Failed", value: "2" },
        ]}
        nextAction="Open the first diagnostic and reproduce the failure."
      />
      <ResultSummary
        state="blocked"
        fact="The run stopped because a required credential is unavailable."
        nextAction="Provide the credential, then retry the run."
      />
      <ResultSummary
        state="changed"
        fact="Formatting updated three files."
        counts={[{ label: "Files", value: "3" }]}
        duration={<time dateTime="PT2S">2 s</time>}
      />
      <ResultSummary
        state="unchanged"
        fact="No tracked files changed."
        nextAction="Continue with the next planned check."
      />
    </div>
  );
}
