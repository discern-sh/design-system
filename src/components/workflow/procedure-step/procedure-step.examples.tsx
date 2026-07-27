import { RetryNotice } from "../retry-notice/retry-notice.tsx";
import { ProcedureStep } from "./procedure-step.tsx";

export default function ProcedureStepExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ProcedureStep
        title="Verify the generated output"
        action={
          <p>
            Rebuild the output from its authored inputs, then inspect the
            resulting summary before moving on.
          </p>
        }
        command={{
          command: "deno task build",
          explanation: "Recreates derived output from the current source.",
          copyLabel: "Copy build command",
          copiedLabel: "Build command copied",
        }}
        expectedResult={{
          variant: "state",
          children:
            "The build exits successfully and reports no stale generated files.",
        }}
        completionCriterion="The derived output matches the authored source and the working tree contains only intended changes."
        recovery={
          <RetryNotice
            safeToRetry
            reason="The build is deterministic and replaces only its generated output."
          />
        }
      />
      <ProcedureStep
        title="Choose the verification depth"
        action="Select the path that matches the evidence needed for this handoff."
        branch={{
          choices: [
            {
              label: "A focused check is enough",
              path: "Run the affected test",
              href: "#focused-check",
            },
            {
              label: "The public contract changed",
              path: "Run the full release gate",
              href: "#release-gate",
            },
          ],
        }}
      />
    </div>
  );
}
