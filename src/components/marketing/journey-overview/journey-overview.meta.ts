import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Journey overview",
  slug: "journey-overview",
  group: "Marketing",
  order: 180,
  description:
    "Spacious ordered overview that compresses a journey into a few plain-language moments.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is a page-scale responsive rhythm that turns a short ordered list into visual compression; terminal flows already communicate sequence directly through ordered text.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A complex process can be honestly summarized into a few audience-facing moments with one clear outcome each.",
  ],
  notWhen: [
    "Readers must execute detailed instructions, inspect technical state, or recover from branches; use Procedure or a dedicated workflow component instead.",
  ],
  accessibility: [
    "Steps use a native ordered list, so their sequence does not depend on decorative indices or the desktop grid.",
    "Each step keeps its title, explanation, and optional outcome together when the layout collapses.",
  ],
} satisfies ComponentMeta;
