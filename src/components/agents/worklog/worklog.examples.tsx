import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Worklog } from "./worklog.tsx";
import meta, { componentExampleVocabulary } from "./worklog.meta.ts";

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

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ActiveRunState },
    { id: "failure", Example: FailedRunState },
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
