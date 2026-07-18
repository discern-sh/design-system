import type { ComponentMeta } from "../../../types/component-meta.ts";
export default {
  name: "Profile card",
  slug: "profile-card",
  group: "People",
  order: 60,
  description:
    "Team-member card: square editorial portrait, serif name, kicker-style detail, short bio, and a links slot — portrait or landscape.",
  accessibility: [
    "The name is an h3 heading at the same depth marketing grid items use; compose cards beneath an h2 section title.",
    "The built-in portrait is decorative — the visible printed name carries the identity.",
    "The links slot expects real anchors from the consumer; the card adds layout, never click behaviour.",
  ],
} satisfies ComponentMeta;
