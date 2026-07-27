import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../styleguide/conformance.ts";
import { TaskMetadata } from "./task-metadata.tsx";

export const conformance = [{
  name: "all task facts remain contained at a narrow viewport",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-task-metadata-narrow]" },
  }, {
    expect: "visible",
    target: {
      selector:
        "[data-example-task-metadata-narrow] .discern-task-metadata__fact:last-child dd",
    },
  }],
}] satisfies readonly ConformanceScenario[];

function ReadOnlyTaskState() {
  return (
    <TaskMetadata
      outcome="Confirm that a configuration matches its schema."
      audience="Maintainers reviewing a project configuration."
      prerequisites="A local checkout and the validation command."
      complexity="About 5 minutes"
      fileEffects="none"
      retrySafety="safe"
      expectedState="Validation succeeds and the worktree remains unchanged."
    />
  );
}

function FileChangingTaskState() {
  return (
    <TaskMetadata
      outcome="Regenerate a derived reference from its source registry."
      audience="Maintainers changing a public contract."
      prerequisites="The source registry is current and the worktree is clean."
      complexity="About 15 minutes"
      fileEffects="changes-files"
      retrySafety="check-first"
      expectedState="The reference matches its source and only expected files have changed."
      data-example-task-metadata-narrow
    />
  );
}

export const catalogueStates = [{
  name: "default",
  label: "Read-only task",
  Example: ReadOnlyTaskState,
}, {
  name: "file-changing",
  label: "File-changing task",
  Example: FileChangingTaskState,
}] satisfies readonly CatalogueExampleState[];

export default function TaskMetadataExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ReadOnlyTaskState />
      <FileChangingTaskState />
    </div>
  );
}
