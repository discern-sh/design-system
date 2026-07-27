import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Process steps",
  slug: "process-steps",
  group: "Marketing",
  order: 70,
  description:
    "Numbered horizontal or vertical journey for onboarding, workflow, implementation, or methodology stories.",
  purposes: ["marketing-site"],
  useWhen: [
    "A marketing or onboarding page needs to explain a high-level journey or methodology.",
  ],
  notWhen: [
    "Readers must perform executable, ordered actions with prerequisites, branches, recovery, and proof; use Procedure.",
  ],
  accessibility: [
    "Steps are an ordered list, so sequence remains explicit without the visual connectors.",
  ],
} satisfies ComponentMeta;
