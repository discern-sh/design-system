import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../catalogue/conformance.ts";
import { AgentHandoff } from "./agent-handoff.tsx";

const handoffPrompt = `Review the configuration change in this worktree.
Run the project checks.
Report the files changed, the commands run, and any remaining risk.`;

const longPrompt = `Update the generated reference from its source registry.
Work only in the assigned worktree and preserve unrelated changes.
Inspect /path/to/a/deliberately/long/project/reference/source-registry.ts before editing.
Run the repository's quality gate, then report the resulting files and evidence.`;

const copyTarget = {
  selector: "[data-example-agent-handoff-copy] .discern-copy-button",
} as const;

export const conformance = [{
  name: "keyboard copy writes only the prompt and retains focus",
  steps: [
    { action: "focus", target: copyTarget },
    { action: "press", key: "Enter", target: copyTarget },
    {
      expect: "attribute",
      target: copyTarget,
      attribute: "data-discern-copied",
      value: "",
    },
    { expect: "clipboard", value: handoffPrompt },
    {
      expect: "attribute",
      target: {
        selector:
          '[data-example-agent-handoff-copy] .discern-copy-button [aria-live="polite"]',
      },
      attribute: "aria-live",
      value: "polite",
    },
    { expect: "focused", target: copyTarget },
  ],
}, {
  name: "a long prose prompt wraps inside a narrow viewport",
  viewport: { width: 390, height: 1200 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-agent-handoff-narrow]" },
  }, {
    expect: "contained-x",
    target: {
      selector:
        "[data-example-agent-handoff-narrow] .discern-agent-handoff__prompt",
    },
  }, {
    expect: "visible",
    target: {
      selector:
        "[data-example-agent-handoff-narrow] .discern-agent-handoff__prompt",
    },
  }],
}] satisfies readonly ConformanceScenario[];

function DefaultAgentHandoffState() {
  return (
    <AgentHandoff
      title="Hand this review to an agent"
      description="The prompt carries the task boundary and the evidence expected back."
      data-example-agent-handoff-copy
    >
      {handoffPrompt}
    </AgentHandoff>
  );
}

function LongAgentHandoffState() {
  return (
    <AgentHandoff
      title="Hand off a reference update"
      description="Long paths and instructions wrap as prose rather than scrolling like a command."
      data-example-agent-handoff-narrow
    >
      {longPrompt}
    </AgentHandoff>
  );
}

export const catalogueStates = [{
  name: "default",
  label: "Review handoff",
  Example: DefaultAgentHandoffState,
}, {
  name: "long-prompt",
  label: "Long wrapping prompt",
  Example: LongAgentHandoffState,
}] satisfies readonly CatalogueExampleState[];

export default function AgentHandoffExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <DefaultAgentHandoffState />
      <LongAgentHandoffState />
    </div>
  );
}
