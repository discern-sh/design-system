import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Editorial hero",
  slug: "editorial-hero",
  group: "Marketing",
  order: 160,
  description:
    "Selective campaign-page opening with a broad editorial statement and an optional low-burden visual stage.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is browser-scale editorial proportion, atmospheric layering, and a wide visual stage; a terminal opening should use a concise native heading frame instead.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A page needs one decisive opening statement whose supporting visual compresses or relieves the copy rather than adding another body of text.",
  ],
  notWhen: [
    "The composition sits midway through a page or needs ordinary heading scale; use Narrative chapter or Marketing intro.",
    "The only available visual is a dense transcript or code listing; omit the visual or reduce it to a concise piece of evidence first.",
  ],
  accessibility: [
    "The heading rank is explicit so the component can open a page or a nested campaign.",
    "The visual follows the explanatory copy in source order when the composition collapses.",
    "Decorative ground content is always hidden from assistive technology.",
  ],
} satisfies ComponentMeta;
