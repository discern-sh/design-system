import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Marketing section",
  slug: "marketing-section",
  group: "Marketing",
  order: 5,
  description:
    "Opt-in campaign-page section with durable frame, rhythm, and contrast scopes.",
  cli: {
    stance: "exempt",
    reason:
      "Its contract is a browser page-width, spacing, and background scope; terminal Marketing renderers own their width and hierarchy within each frame instead.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A campaign or landing page needs a repeatable wide frame, generous section rhythm, or a stable dark contrast chapter.",
  ],
  notWhen: [
    "An application or ordinary editorial page only needs a semantic surface and standard spacing; use Section with Container.",
  ],
  accessibility: [
    "The contrast surface remaps semantic ink, surface, and border roles together so descendant headings and copy remain readable in both themes.",
    "The component preserves a native section landmark and leaves heading hierarchy to its content.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "standard", label: "Standard canvas", only: "web" },
    {
      id: "spacious-contrast",
      label: "Wide spacious contrast",
      only: "web",
    },
  ],
);

export default meta;
