import { CommandGroup } from "./command-group.tsx";

export default function CommandGroupExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <p style={{ margin: 0 }}>
        The alternatives stay stacked so every choice remains readable before
        any client-side behaviour runs.
      </p>
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
            copyLabel: "Copy inspection command",
            copiedLabel: "Inspection command copied",
          },
          {
            label: "Run the full test task",
            command: "deno task test",
            explanation: "Runs the project's complete configured test task.",
            expectedResult: "All tests pass.",
            copyLabel: "Copy test command",
            copiedLabel: "Test command copied",
          },
        ]}
      />
    </div>
  );
}
