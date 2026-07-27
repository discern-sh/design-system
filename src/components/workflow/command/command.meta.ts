import type { ComponentMeta } from "../../../types/component-meta.ts";

export default {
  name: "Command",
  slug: "command",
  group: "Workflow",
  order: 10,
  description:
    "Executable input with working-directory and platform context, an explanation, embedded expected proof, a failure note, and a clean-copy affordance.",
  accessibility: [
    "The command is preformatted, never wraps, and its focusable region scrolls horizontally from the keyboard when it exceeds the available width.",
    "No prompt glyph is rendered, so both copied and assistive-technology text contain only the executable input.",
    "The adapter-only copy action announces its transient text state politely and leaves keyboard focus on the button.",
    "Failure guidance uses an explicit text label alongside attention colour.",
  ],
} satisfies ComponentMeta;
