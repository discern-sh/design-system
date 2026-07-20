import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Prose } from "../../editorial/prose/prose.tsx";
import { GlossaryTerm } from "./glossary-term.tsx";

export const conformance = [{
  name: "keyboard focus reveals and leaves a glossary definition",
  viewport: { width: 390, height: 844 },
  steps: [
    {
      action: "focus",
      target: {
        selector:
          "[data-example-glossary-term] .discern-glossary-term__trigger",
      },
    },
    {
      expect: "visible",
      target: { role: "group", name: "Worktree definition" },
    },
    {
      expect: "within-viewport",
      target: { role: "group", name: "Worktree definition" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "hidden",
      target: { role: "group", name: "Worktree definition" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function GlossaryTermExamples() {
  return (
    <Prose>
      <p>
        Each change begins in a{" "}
        <GlossaryTerm
          definition="A separate checkout and branch used for one isolated line of work."
          data-example-glossary-term
        >
          Worktree
        </GlossaryTerm>
        , while the shared landing branch stays undisturbed.
      </p>
      <p>
        A{" "}
        <GlossaryTerm
          definition="A recorded quality check tied to one clean commit."
          placement="bottom"
          align="start"
          width="sm"
        >
          gate receipt
        </GlossaryTerm>{" "}
        preserves the evidence used at handoff.
      </p>
    </Prose>
  );
}
