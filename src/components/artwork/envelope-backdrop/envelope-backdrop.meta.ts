import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Envelope backdrop",
  slug: "envelope-backdrop",
  group: "Artwork",
  order: 70,
  description:
    "Straight chord families that imply curves while one light crest travels their tangents.",
  cli: {
    stance: "exempt",
    reason:
      "Envelope backdrop's chord families imply curves through precise scalable tangencies and a travelling light crest, relationships a terminal-cell rendering would misstate.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A corner or broad canvas needs mathematical density with no filled surface.",
  ],
  notWhen: [
    "The foreground needs a uniformly quiet field with no directional incident.",
  ],
  accessibility: [
    "The composition is always hidden from assistive technology and never receives focus.",
    "Reduced-motion preferences preserve the complete authored still rather than an empty state.",
    "Forced-colour modes omit the decorative layer so foreground content remains unambiguous.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Envelope field", only: "web" }],
);

export default meta;
