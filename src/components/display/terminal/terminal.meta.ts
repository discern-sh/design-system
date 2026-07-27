import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Terminal",
  slug: "terminal",
  group: "Display",
  order: 80,
  description: "Framed monospace surface for commands and terminal output.",
  purposes: ["displaying-tool-output"],
  useWhen: [
    "You need to reproduce a terminal session or present interleaved commands and output as one framed surface.",
  ],
  notWhen: [
    "A reader must copy and run one exact command with working-directory, expected-result, or failure context; use Command.",
  ],
  accessibility: [
    "Output preserves whitespace and scrolls horizontally instead of wrapping long lines.",
    "Provide a concise title when the terminal output needs additional context.",
  ],
} satisfies ComponentMeta;
