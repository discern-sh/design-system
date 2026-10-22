import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Docs header",
  slug: "docs-header",
  group: "Docs",
  order: 20,
  cli: { stance: "rendered" },
  description:
    "Sticky opaque documentation top bar with brand, middle, and action regions.",
  purposes: ["building-documentation"],
  accessibility: [
    "The header element is a banner landmark; slotted controls keep their own semantics and focus outlines.",
    "The opaque surface role keeps token-driven text contrast over scrolled content in both themes.",
    "The inner row measures against --discern-docs-header-max, falling back to --discern-page-max, so a shell whose columns run wider than an article widens the bar without re-pointing the page token. Above Docs layout, set it to the layout's maximum plus its two gutters, calc(var(--discern-page-max) + 10rem + 2 * var(--discern-space-5)), so the brand and the middle share the columns' edges.",
    "A slotted trigger's keyboard chips belong in an aria-hidden discern-docs-header__shortcut, with aria-keyshortcuts on the control announcing the chord; below a 32rem row the header drops the chips and tightens its gaps so the trigger stays on one line.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [{
  id: "default",
  label: "Documentation header",
}] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
