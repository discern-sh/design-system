import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Voice break",
  slug: "voice-break",
  group: "Marketing",
  order: 200,
  description:
    "Low-burden change of voice that lets one concise quotation interrupt a demanding page.",
  cli: {
    stance: "exempt",
    reason:
      "Its contract is browser page rhythm and the spatial contrast between a large quotation and compact attribution; terminals can quote prose without a dedicated renderer.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A text-heavy page needs a brief human perspective or memorable sentence before returning to explanation.",
  ],
  notWhen: [
    "The quotation needs a metric, long customer story, or substantial evidence; use Testimonial or Case study instead.",
  ],
  accessibility: [
    "Quotation and attribution use native blockquote and figcaption semantics.",
    "The optional portrait is decorative because the readable attribution remains complete without it.",
    "The quotation precedes its attribution in the narrow visual layout while remaining part of the same figure.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "calm", label: "Calm voice", only: "web" },
    { id: "contrast", label: "Contrast voice", only: "web" },
  ],
);

export default meta;
