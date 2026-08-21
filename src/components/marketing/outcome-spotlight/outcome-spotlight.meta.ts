import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Outcome spotlight",
  slug: "outcome-spotlight",
  group: "Marketing",
  order: 190,
  description:
    "Evidence chapter that asks the reader to remember one outcome and only a few supporting facts.",
  cli: {
    stance: "exempt",
    reason:
      "Its distinguishing contract is the browser-scale contrast between one dominant result and a restrained supporting rail; terminal evidence should render as compact semantic facts without display hierarchy.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "One result deserves to carry the section and no more than a few short facts genuinely strengthen it.",
  ],
  notWhen: [
    "All figures have equal importance or require detailed qualification; use Metrics band, Table, or prose instead.",
  ],
  accessibility: [
    "Primary and supporting facts use description lists so every value remains paired with its explanation.",
    "The title precedes the evidence in source order and its rank is explicit.",
    "Contrast is inherited from Marketing section's complete semantic role remapping.",
  ],
} satisfies ComponentMeta;
