import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Docs layout",
  slug: "docs-layout",
  group: "Docs",
  order: 25,
  cli: { stance: "rendered" },
  behaviors: ["docs-drawer"],
  description:
    "Documentation reading shell: sticky navigation, one main landmark, and a contents rail in a three-column grid whose navigation becomes an off-canvas drawer at a narrow allocation.",
  purposes: ["building-documentation"],
  useWhen: [
    "A documentation site needs the manual's three regions — site navigation, the document, and a contents rail — beneath a sticky Docs header, with the navigation reachable as a modal drawer on narrow screens.",
    "Static HTML must ship the complete drawer contract without its own layout or drawer script: the selected docs-drawer behaviour activates a toggle carrying data-discern-docs-drawer-toggle and aria-controls naming the navigation.",
  ],
  notWhen: [
    "Use Article layout for a single long-form article whose body is the article itself; Docs layout renders a main landmark for a page that composes its own article.",
    "Use Container when a page needs only a centred reading measure.",
  ],
  accessibility: [
    "The document is the page's main landmark, named by mainId for the consumer's skip link; the contents rail is a labelled complementary landmark, and the navigation column is a plain region whose slotted nav keeps its own name.",
    "Open, the drawer is a modal dialog named by navigationLabel: focus moves to its first focusable, Tab and Shift+Tab wrap between the toggle and the navigation's focusables, everything outside becomes inert, the body stops scrolling, and Escape, the veil, or the toggle closes it and returns focus to the toggle.",
    "Closed at a narrow allocation the navigation is inert and off-canvas; crossing the breakpoint while open closes it without moving focus, and at wider allocations the navigation is never inert.",
    "Without the selected script the navigation stays in normal flow above the document and the toggle and veil stay hidden; the off-canvas position applies only beneath data-discern-docs-drawer-enhanced, which the behaviour stamps on the layout and a consumer's head bootstrap may stamp early to avoid a layout shift.",
    "The toggle names its two states through data-discern-open-label and data-discern-close-label and reports them through aria-expanded; the behaviour re-initialises idempotently, activates later DOM additions, and releases on discern:docs-drawer:teardown.",
    "Set --discern-docs-layout-sticky-offset from the height of the consumer's sticky header; the default matches Docs header's minimum block size.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "default", label: "Documentation shell" },
  { id: "plain", label: "Document and rail" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
