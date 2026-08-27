import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { FileChange } from "./file-change.tsx";
import meta, { componentExampleVocabulary } from "./file-change.meta.ts";

function UpdatedFileState() {
  return (
    <FileChange
      path="/workspace/project.toml"
      disposition="updated"
      magnitude={{ added: 6, removed: 3 }}
    />
  );
}

function AddedFileState() {
  return (
    <FileChange
      path="/workspace/src/components/example.tsx"
      disposition="added"
      magnitude={{ added: 84, removed: 0 }}
    />
  );
}

function GeneratedFileState() {
  return (
    <FileChange
      path="/workspace/generated/component-registry.ts"
      disposition="generated"
      magnitude={{ added: 42, removed: 42 }}
    />
  );
}

function RemovedFileState() {
  return (
    <FileChange
      path="/workspace/src/legacy-adapter.ts"
      disposition="removed"
      magnitude={{ added: 0, removed: 96 }}
    />
  );
}

function UnchangedFileState() {
  return <FileChange path="/workspace/README.md" disposition="unchanged" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: UpdatedFileState },
    { id: "added", Example: AddedFileState },
    { id: "generated", Example: GeneratedFileState },
    { id: "removed", Example: RemovedFileState },
    { id: "unchanged", Example: UnchangedFileState },
  ],
);

export default function FileChangeExamples() {
  return (
    <div
      className="discern-example-stack discern-example-stack--start"
      style={{ maxWidth: "44rem" }}
    >
      <UpdatedFileState />
      <AddedFileState />
      <GeneratedFileState />
      <RemovedFileState />
      <UnchangedFileState />
    </div>
  );
}
