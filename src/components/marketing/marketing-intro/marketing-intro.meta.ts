import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Marketing intro",
  slug: "marketing-intro",
  group: "Marketing",
  order: 15,
  description:
    "Eyebrow, headline, and standfirst composition for marketing-page sections.",
  cli: {
    stance: "exempt",
    reason:
      "Terminal Marketing renderers already share the equivalent text hierarchy through their frame helper; this component's distinct contract is browser measure, alignment, and responsive display scale.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A marketing section needs a repeatable eyebrow, headline, and standfirst hierarchy at ordinary or campaign scale.",
  ],
  notWhen: [
    "The composition opens a page with actions or a visual; use Hero block.",
    "The composition opens long-form editorial content with bylines and metadata; use Article header.",
  ],
  accessibility: [
    "The heading rank is explicit so the intro can preserve the surrounding document hierarchy.",
    "Contrast tone keeps the eyebrow, title, and supporting copy legible on a stable dark surface in either theme.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "editorial", label: "Editorial scale", only: "web" },
  { id: "contrast", label: "Centred contrast", only: "web" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
