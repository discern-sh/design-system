import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Copy button",
  slug: "copy-button",
  group: "Docs",
  order: 80,
  cli: {
    stance: "exempt",
    reason:
      "Clipboard mutation and transient confirmation require an interactive driver, not a pure terminal renderer.",
  },
  description:
    "Clipboard copy button with a transient copied state, an optional icon slot, and a polite announcement.",
  purposes: ["building-documentation"],
  accessibility: [
    "The label swap between copy and copied is announced through a polite live region.",
    "The copied state is carried by a data attribute, so colour is reinforced by the announced text rather than colour alone.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [{ id: "default", label: "Copy action", only: "web" }],
);

export default meta;
