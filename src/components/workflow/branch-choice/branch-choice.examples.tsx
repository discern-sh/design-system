import type {
  CatalogueExampleState,
  ConformanceScenario,
} from "../../../../styleguide/conformance.ts";
import { BranchChoice } from "./branch-choice.tsx";

export const conformance = [{
  name: "linked routes follow their visible list order by keyboard",
  steps: [
    {
      action: "focus",
      target: {
        selector: "[data-example-procedure-fork] a[href='#verification']",
      },
    },
    { action: "press", key: "Tab" },
    {
      expect: "focused",
      target: {
        selector: "[data-example-procedure-fork] a[href='#recovery']",
      },
    },
    { action: "press", key: "Tab" },
    {
      expect: "focused",
      target: {
        selector: "[data-example-procedure-fork] a[href='#prerequisite']",
      },
    },
  ],
}, {
  name: "four next actions remain contained at a narrow viewport",
  viewport: { width: 390, height: 1200 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-next-action]" },
  }, {
    expect: "contained-x",
    target: { selector: "[data-example-next-action]" },
  }],
}] satisfies readonly ConformanceScenario[];

function ProcedureForkState() {
  return (
    <BranchChoice
      title="Match the route to what happened"
      choices={[
        {
          label: "It worked",
          path: "Continue to verification",
          href: "#verification",
        },
        {
          label: "It failed",
          path: "Open recovery guidance",
          href: "#recovery",
        },
        {
          label: "The outcome is unclear",
          path: "Review the prerequisite",
          href: "#prerequisite",
        },
      ]}
      data-example-procedure-fork
    />
  );
}

function NextActionState() {
  return (
    <BranchChoice
      title="Choose what happens next"
      choices={[
        {
          label: "Recommended — it worked",
          path: "Continue to the next task",
          href: "#continue",
        },
        {
          label: "It failed",
          path: "Open troubleshooting",
          href: "#troubleshooting",
        },
        {
          label: "I need the reference",
          path: "Read the command reference",
          href: "#reference",
        },
        {
          label: "Hand it to an agent",
          path: "Open the agent handoff",
          href: "#agent-handoff",
        },
      ]}
      data-example-next-action
    />
  );
}

export const catalogueStates = [{
  name: "default",
  label: "Procedure fork",
  Example: ProcedureForkState,
}, {
  name: "next-action",
  label: "End-of-page next action",
  Example: NextActionState,
}] satisfies readonly CatalogueExampleState[];

export default function BranchChoiceExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ProcedureForkState />
      <NextActionState />
    </div>
  );
}
