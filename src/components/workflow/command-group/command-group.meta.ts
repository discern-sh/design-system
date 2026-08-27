import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Command group",
  slug: "command-group",
  group: "Workflow",
  order: 20,
  cli: { stance: "rendered" },
  description:
    "Named command alternatives stacked with clear labels, keeping every option readable and executable in static HTML without tab behaviour.",
  purposes: ["building-documentation", "procedural-workflow"],
  useWhen: [
    "Readers need labelled command alternatives for different platforms or equivalent tools.",
  ],
  notWhen: [
    "The commands must run in sequence; place Command components inside Procedure steps.",
  ],
  accessibility: [
    "Alternatives remain an ordered list rather than becoming hidden tab panels.",
    "A string title labels the group automatically; non-text titles should be paired with an explicit aria-label.",
    "Each alternative retains the Command component's complete run context and copy behaviour.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Verification choices",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
