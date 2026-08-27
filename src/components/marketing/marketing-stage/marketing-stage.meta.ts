import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Marketing stage",
  slug: "marketing-stage",
  group: "Marketing",
  order: 150,
  description:
    "Quiet, consistent framing for conceptual, atmospheric, or evidential marketing visuals.",
  cli: {
    stance: "exempt",
    reason:
      "Its contract is browser media proportion, material framing, and visual overflow; terminal renderers frame their own deterministic text directly.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A marketing composition needs one restrained frame for artwork, a diagram, media, or a concise piece of evidence.",
  ],
  notWhen: [
    "The supplied content is primarily prose or a long terminal transcript; keep it in the reading flow instead of presenting it as imagery.",
  ],
  accessibility: [
    "The optional caption uses native figure semantics and remains associated with the supplied visual content.",
    "The component does not infer whether supplied artwork is meaningful or decorative; consumers retain responsibility for the child content's accessible alternative.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "framed", label: "Framed concept", only: "web" },
  { id: "inset", label: "Inset atmosphere", only: "web" },
  { id: "plain", label: "Plain artwork", only: "web" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
