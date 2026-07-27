import { FileChange } from "./file-change.tsx";

export default function FileChangeExamples() {
  return (
    <div
      className="discern-example-stack discern-example-stack--start"
      style={{ maxWidth: "44rem" }}
    >
      <FileChange
        path="/workspace/src/components/example.tsx"
        disposition="added"
        magnitude={{ added: 84, removed: 0 }}
      />
      <FileChange
        path="/workspace/project.toml"
        disposition="updated"
        magnitude={{ added: 6, removed: 3 }}
      />
      <FileChange
        path="/workspace/generated/component-registry.ts"
        disposition="generated"
        magnitude={{ added: 42, removed: 42 }}
      />
      <FileChange
        path="/workspace/src/legacy-adapter.ts"
        disposition="removed"
        magnitude={{ added: 0, removed: 96 }}
      />
      <FileChange
        path="/workspace/README.md"
        disposition="unchanged"
      />
    </div>
  );
}
