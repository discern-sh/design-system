import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Copy button",
  slug: "copy-button",
  group: "Docs",
  order: 80,
  description:
    "Clipboard copy button with a transient copied state, an optional icon slot, and a polite announcement.",
  accessibility: [
    "The label swap between copy and copied is announced through a polite live region.",
    "The copied state is carried by a data attribute, so colour is reinforced by the announced text rather than colour alone.",
  ],
} satisfies ComponentMeta;
