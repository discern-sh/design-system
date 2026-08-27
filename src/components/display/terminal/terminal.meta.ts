import { defineComponentExampleVocabulary } from "../../../types/component-examples.ts";
import type { ComponentMeta } from "../../../types/component-meta.ts";

const meta = {
  name: "Terminal",
  slug: "terminal",
  group: "Display",
  order: 80,
  description:
    "Framed monospace surface for commands and terminal output, including a stable dark campaign showcase.",
  cli: { stance: "rendered" },
  purposes: ["displaying-tool-output", "marketing-site"],
  useWhen: [
    "You need to reproduce a terminal session or present interleaved commands and output as one framed surface.",
    "A marketing page needs structured tool output with optional trailing chrome and a compact explanatory footer; use showcase.",
  ],
  notWhen: [
    "A reader must copy and run one exact command with working-directory, expected-result, or failure context; use Command.",
  ],
  accessibility: [
    "Output preserves whitespace and scrolls horizontally instead of wrapping long lines.",
    "Provide a concise title when the terminal output needs additional context.",
    "Showcase keeps output light-on-dark in both themes while preserving the same preformatted text.",
  ],
} satisfies ComponentMeta;

export const componentExampleVocabulary = defineComponentExampleVocabulary(
  meta,
  [
    { id: "standard", label: "Standard" },
    { id: "showcase", label: "Showcase" },
  ],
);

export default meta;
