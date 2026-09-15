import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Code listing",
  slug: "code-listing",
  group: "Editorial",
  order: 80,
  cli: { stance: "rendered" },
  description:
    "Captioned source listing with standard and campaign showcase treatments, file and language context, single-hue lexical emphasis, exact-source copying, stable line numbers, optional visual wrapping, horizontal scrolling, and highlighted lines.",
  purposes: ["building-documentation", "marketing-site"],
  useWhen: [
    "A reader needs source with stable line references; use showcase when the listing is visual evidence inside a campaign page.",
  ],
  accessibility: [
    "Source remains semantic preformatted code; line numbers, highlights, and emphasis do not alter its readable text.",
    "Lexical emphasis is presentation only: it recognises comments, strings, numbers, and punctuation from delimiters alone, never keywords or grammar, and leaves the readable text and the copied string unchanged.",
    "Wrapping is an authored browser-only option; the default scrolls horizontally. Both preserve logical line numbers and the exact copied string.",
    "CopyButton uses the selected runtime script; without it the copy control is inert and source remains selectable. Set copyable=false to omit the action.",
    "The CLI keeps its existing width-bounded, truncated listing; browser wrap and copyable do not change terminal bytes. Use CLI Code block for lossless source inspection.",
    "Showcase keeps the same semantic code and caption while using stable inverse roles in both themes.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = [
  { id: "standard", label: "Standard" },
  { id: "showcase", label: "Showcase" },
] as const;
defineComponentExampleVocabulary(meta, componentExampleVocabulary);

export default meta;
