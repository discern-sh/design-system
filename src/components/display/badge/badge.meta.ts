import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Badge",
  slug: "badge",
  group: "Display",
  order: 10,
  description: "Compact status and metadata label with semantic tones.",
  cli: { stance: "rendered" },
  purposes: ["marketing-site"],
  useWhen: [
    "A compact visible label communicates status, category, or arbitrary metadata.",
  ],
  notWhen: [
    "The label must distinguish authored, generated, project-owned, or tool-owned provenance; use Ownership badge.",
  ],
} satisfies ComponentMeta;
