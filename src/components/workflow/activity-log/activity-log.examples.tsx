import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ActivityLog } from "./activity-log.tsx";
import meta, { componentExampleVocabulary } from "./activity-log.meta.ts";

function StreamingActivityState() {
  return (
    <ActivityLog
      style={{ maxWidth: "34rem" }}
      label="Running the checks"
      stable={[
        { text: "Format held every file in place", tone: "success" },
        { text: "Generated surfaces are current", tone: "success" },
        { text: "One suite retried before passing", tone: "warning" },
      ]}
      tail={[
        "compile step 41 of 58",
        "compile step 42 of 58",
        "    cache miss: layout graph rebuilt",
        "compile step 43 of 58",
      ]}
      partial="compile step 44 of 58 · linking"
      hint="Press Ctrl+C to interrupt."
    />
  );
}

function CompletedActivityState() {
  return (
    <ActivityLog
      style={{ maxWidth: "34rem" }}
      label="Running the checks"
      status="complete"
      stable={[
        { text: "Format held every file in place", tone: "success" },
        { text: "58 modules compiled", tone: "success" },
        { text: "Preview publishing was skipped", tone: "note" },
      ]}
    />
  );
}

function CancelledActivityState() {
  return (
    <ActivityLog
      style={{ maxWidth: "34rem" }}
      label="Running the checks"
      status="cancelled"
      stable={[
        { text: "Format held every file in place", tone: "success" },
        { text: "Compilation stopped at step 44", tone: "failure" },
      ]}
      hint="Cancelled."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: StreamingActivityState },
    { id: "complete", Example: CompletedActivityState },
    { id: "cancelled", Example: CancelledActivityState },
  ],
);

export default function ActivityLogExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <StreamingActivityState />
      <CompletedActivityState />
      <CancelledActivityState />
    </div>
  );
}
