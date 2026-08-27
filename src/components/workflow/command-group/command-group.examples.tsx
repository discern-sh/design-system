import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { CommandGroup } from "./command-group.tsx";
import meta, { componentExampleVocabulary } from "./command-group.meta.ts";

function VerificationChoicesState() {
  return (
    <CommandGroup
      title="Choose a verification depth"
      items={[
        {
          label: "Inspect the working tree",
          command: "git status",
          explanation: "Reports the current branch and local changes.",
          expectedResult:
            "The branch and working-tree state are printed immediately.",
          expectedResultVariant: "state",
        },
        {
          label: "Run the full test task",
          command: "deno task test",
          explanation: "Runs the project's complete configured test task.",
          expectedResult: "All tests pass.",
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: VerificationChoicesState }],
);

export default function CommandGroupExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <VerificationChoicesState />
    </div>
  );
}
