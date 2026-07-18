import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { AgentMention } from "./agent-mention.tsx";
import { AgentAvatar } from "../agent-avatar/agent-avatar.tsx";

export const conformance = [{
  name: "a linked agent mention is focusable and hides its sigil from the name",
  steps: [
    {
      action: "focus",
      target: { selector: 'a.discern-agent-mention[href="#quill"]' },
    },
    {
      expect: "focused",
      target: { selector: 'a.discern-agent-mention[href="#quill"]' },
    },
    {
      expect: "attribute",
      target: { selector: 'a[href="#quill"] .discern-agent-mention__sigil' },
      attribute: "aria-hidden",
      value: "true",
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function AgentMentionExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <p style={{ margin: 0, maxWidth: "38rem" }}>
        Overnight <AgentMention name="quill" href="#quill" />{" "}
        landed the refactor, <AgentMention name="forge-2" />{" "}
        picked up the follow-up in its own worktree, and{" "}
        <AgentMention
          name="atlas-3"
          avatar={<AgentAvatar name="atlas-3" decorative />}
        />{" "}
        is still waiting on review.
      </p>
      <p style={{ margin: 0, fontSize: "0.85rem" }}>
        Smaller running text keeps the chip in scale — nice work,{" "}
        <AgentMention name="lantern-9" href="#lantern" />.
      </p>
    </div>
  );
}
