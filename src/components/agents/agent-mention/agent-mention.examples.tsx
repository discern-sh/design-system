import {
  type ConformanceScenario,
  defineCatalogueExamples,
} from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { AgentMention } from "./agent-mention.tsx";
import meta, { componentExampleVocabulary } from "./agent-mention.meta.ts";

export const conformance = [{
  example: "linked",
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

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "press-linked-mention",
      label: "Linked mention pointer contact",
      example: "linked",
      category: "interaction",
      sequence: [
        {
          action: "pointer-down",
          target: { selector: 'a.discern-agent-mention[href="#quill"]' },
        },
        {
          checkpoint: {
            id: "linked-mention-pressed",
            label: "Linked mention pointer held",
          },
        },
        {
          action: "pointer-up",
          target: { selector: 'a.discern-agent-mention[href="#quill"]' },
        },
      ],
      capture: { selectors: [".discern-agent-mention"] },
    },
  ] as const,
);

export default function AgentMentionExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <StaticMentionState />
      <LinkedMentionState />
    </div>
  );
}
