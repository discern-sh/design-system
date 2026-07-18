import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Mention } from "./mention.tsx";

const portrait =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23cfd6e4'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%23515f7d'/%3E%3Cpath d='M9 61c2-14 11-22 23-22s21 8 23 22z' fill='%23515f7d'/%3E%3C/svg%3E";

export const conformance = [{
  name: "a linked mention is focusable and hides its sigil from the name",
  steps: [
    { action: "focus", target: { selector: 'a.discern-mention[href="#morgan"]' } },
    { expect: "focused", target: { selector: 'a.discern-mention[href="#morgan"]' } },
    {
      expect: "attribute",
      target: { selector: 'a[href="#morgan"] .discern-mention__sigil' },
      attribute: "aria-hidden",
      value: "true",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function MentionExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <p style={{ margin: 0, maxWidth: "38rem" }}>
        The review from <Mention name="Morgan Ellis" href="#morgan" />{" "}
        landed this morning, and <Mention name="Priya Anand" src={portrait} />
        {" "}
        picked up the follow-up work after a short handover call with{" "}
        <Mention name="Ada Osei" />.
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem" }}>
        Smaller running text keeps the chip in scale — thanks{" "}
        <Mention name="June Park" href="#june" />.
      </p>
    </div>
  );
}
