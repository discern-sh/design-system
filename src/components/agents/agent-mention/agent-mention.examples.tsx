import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { AgentMention } from "./agent-mention.tsx";
import meta, { componentExampleVocabulary } from "./agent-mention.meta.ts";

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

function StaticMentionState() {
  return (
    <p style={{ margin: 0 }}>
      The follow-up belongs to <AgentMention name="forge-2" />.
    </p>
  );
}

function LinkedMentionState() {
  return (
    <p style={{ margin: 0 }}>
      Review the work from <AgentMention name="quill" href="#quill" />.
    </p>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: StaticMentionState },
    { id: "linked", Example: LinkedMentionState },
  ],
);

export default function AgentMentionExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <StaticMentionState />
      <LinkedMentionState />
    </div>
  );
}
