import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Command } from "./command.tsx";

const copyTarget = {
  selector: "[data-example-command-copy] .discern-copy-button",
} as const;

export const conformance = [{
  name: "keyboard copy announces completion without moving focus",
  steps: [
    { action: "focus", target: copyTarget },
    { action: "press", key: "Enter", target: copyTarget },
    {
      expect: "attribute",
      target: copyTarget,
      attribute: "data-discern-copied",
      value: "",
    },
    {
      expect: "attribute",
      target: {
        selector:
          '[data-example-command-copy] .discern-copy-button [aria-live="polite"]',
      },
      attribute: "aria-live",
      value: "polite",
    },
    { expect: "focused", target: copyTarget },
  ],
}, {
  name: "a long command stays contained at a narrow viewport",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-command-overflow]" },
  }, {
    expect: "visible",
    target: {
      selector: "[data-example-command-overflow] .discern-command__text code",
    },
  }],
}] satisfies readonly ConformanceScenario[];

export default function CommandExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Command
        command="git status"
        workingDirectory="/path/to/project"
        explanation="Shows the current branch and any tracked or untracked changes."
        expectedResult="On branch main
nothing to commit, working tree clean"
        platform="macOS · Linux · WSL2"
        data-example-command-copy
      />
      <Command
        command="git status --short --branch --untracked-files=all --ignore-submodules=none"
        workingDirectory="/path/to/a/project/with/a/deliberately/long/location"
        explanation="A long command stays on one faithful line and scrolls instead of wrapping."
        copyLabel="Copy long command"
        copiedLabel="Long command copied"
        data-example-command-overflow
      />
      <Command
        command="deno task test"
        explanation="Runs the project's configured test task."
        expectedResult="All tests pass and the process exits successfully."
        expectedResultVariant="state"
        failureNote="Confirm the task exists and that the test runner has permission to launch its local browser."
        copyLabel="Copy test command"
        copiedLabel="Test command copied"
      />
    </div>
  );
}
