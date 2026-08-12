import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Site header",
  slug: "site-header",
  group: "Marketing",
  order: 10,
  description:
    "Responsive landing-page masthead with standard and campaign treatments, optional notice, navigation, actions, and sticky positioning.",
  cli: {
    stance: "exempt",
    reason:
      "Sticky responsive website mastheads and page navigation are browser chrome; terminal applications expose their own command and prompt navigation rather than a site header.",
  },
  purposes: ["marketing-site"],
  useWhen: [
    "A public page needs persistent brand, section navigation, and a primary action; use the campaign variant for a wider translucent launch-page masthead.",
  ],
  accessibility: [
    "Navigation has a configurable accessible label.",
    "At narrow widths links remain available in a horizontally scrollable row in both variants.",
  ],
} satisfies ComponentMeta;
