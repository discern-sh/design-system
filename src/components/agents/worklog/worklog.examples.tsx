import { Worklog } from "./worklog.tsx";

export default function WorklogExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Worklog
        style={{ maxWidth: "26rem" }}
        entries={[
          {
            label: "Create an isolated worktree",
            status: "done",
            meta: "2s",
          },
          {
            label: "Refactor the checkout flow",
            status: "done",
            detail: "12 files changed",
            meta: "4m",
          },
          {
            label: "Run the test suite",
            status: "active",
            detail: "test · 184 cases",
          },
          { label: "Type-check and lint", status: "queued" },
          { label: "Hand off for review", status: "queued" },
        ]}
      />
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
    </div>
  );
}
