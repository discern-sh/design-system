import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Command",
  slug: "command",
  group: "Workflow",
  order: 10,
  cli: { stance: "rendered" },
  description:
    "Executable input with working-directory and platform context, an explanation, embedded expected proof, a failure note, and a clean-copy affordance.",
  purposes: [
    "building-documentation",
    "displaying-tool-output",
    "procedural-workflow",
  ],
  useWhen: [
    "A reader must run one exact command with its working directory, platform, expected proof, or failure guidance beside it.",
  ],
  notWhen: [
    "You need to reproduce a whole terminal session or interleave commands with output; use Terminal.",
  ],
  accessibility: [
    "The command is preformatted, never wraps, and its focusable region scrolls horizontally from the keyboard when it exceeds the available width.",
    "No shell-prefix glyph is rendered, so both copied and assistive-technology text contain only the executable input.",
    "The adapter-only copy action announces its transient text state politely and leaves keyboard focus on the button.",
    "Failure guidance uses an explicit text label alongside attention colour.",
  ],
} satisfies ComponentMeta;
