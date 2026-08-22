import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Backdrop",
  slug: "backdrop",
  group: "Artwork",
  order: 10,
  description:
    "Decorative, theme-aware background plane with a shared presence and motion contract for authored artwork.",
  cli: {
    stance: "exempt",
    reason:
      "Its contract is a decorative viewport-scaled browser layer with no semantic content to translate into terminal output.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A section needs token-driven decorative artwork behind complete foreground content.",
  ],
  notWhen: [
    "The visual communicates evidence or meaning; use a semantic figure with alternative text instead.",
  ],
  accessibility: [
    "Backdrops are always hidden from assistive technology and never receive focus.",
    "Authored motion resolves to a complete still composition when reduced motion is requested.",
    "Decorative backdrops disappear in forced-colour modes so they cannot obscure foreground content.",
  ],
} satisfies ComponentMeta;
