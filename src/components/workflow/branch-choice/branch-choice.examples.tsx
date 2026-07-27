import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { BranchChoice } from "./branch-choice.tsx";

export const conformance = [{
  name: "linked routes follow their visible list order by keyboard",
  steps: [
    {
      action: "focus",
      target: { role: "link", name: "Continue to verification" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "focused",
      target: { role: "link", name: "Open recovery guidance" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "focused",
      target: { role: "link", name: "Review the prerequisite" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function BranchChoiceExamples() {
  return (
    <BranchChoice
      title="Match the next action to what happened"
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
    />
  );
}
