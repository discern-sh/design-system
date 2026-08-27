import type { ComponentMeta } from "../../../types/component-meta.ts";
import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";

const meta = {
  name: "Raw output",
  slug: "raw-output",
  group: "Workflow",
  order: 230,
  cli: { stance: "rendered" },
  description:
    "Native disclosure for machine-oriented detail, with a visible collapsed or expanded label and faithful horizontal overflow.",
  purposes: ["building-documentation", "displaying-tool-output"],
  useWhen: [
    "Machine-oriented detail should remain available without competing with the human-readable result or diagnostic.",
  ],
  notWhen: [
    "The output is the primary content readers need to compare or act on; show it directly with Terminal, Table, or Diagnostic.",
  ],
  accessibility: [
    "Native details and summary semantics keep the disclosure operable without client JavaScript.",
    "Collapsed and expanded are visible text labels that change with the native open state.",
    "Machine output remains semantic preformatted code and scrolls in both axes instead of forcing the page wider.",
    "The disclosure marker is hidden decoration, and its motion is removed when reduced motion is requested.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "default", label: "Collapsed output" },
    { id: "expanded", label: "Expanded output" },
  ],
);

export default meta;
