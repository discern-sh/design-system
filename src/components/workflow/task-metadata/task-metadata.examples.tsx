import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { TaskMetadata } from "./task-metadata.tsx";
import meta, { componentExampleVocabulary } from "./task-metadata.meta.ts";

export const conformance = [{
  example: "file-changing",
  name: "all task facts remain contained at a narrow viewport",
  viewport: { width: 390, height: 1400 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-task-metadata-narrow]" },
  }, {
    expect: "contained-x",
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
      expectedState="Validation succeeds and the project files remain unchanged."
    />
  );
}

function FileChangingTaskState() {
  return (
    <TaskMetadata
      outcome="Regenerate a derived reference from its source registry."
      audience="Maintainers changing a public contract."
      prerequisites="The source registry is current and the project files have no unrelated changes."
      complexity="About 15 minutes"
      fileEffects="changes-files"
      retrySafety="check-first"
      expectedState="The reference matches its source and only expected files have changed."
      data-example-task-metadata-narrow
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ReadOnlyTaskState },
    { id: "file-changing", Example: FileChangingTaskState },
  ],
);

export default function TaskMetadataExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ReadOnlyTaskState />
      <FileChangingTaskState />
    </div>
  );
}
