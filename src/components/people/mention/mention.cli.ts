/**
 * Pure terminal renderer and deterministic example states for Mention.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { derivedInitials } from "../../initials.ts";

/** Inputs accepted by the terminal Mention renderer. */
export interface MentionCliProps {
  readonly name: string;
  readonly initials?: string;
  readonly sigil?: string;
  readonly avatar?: boolean;
  readonly href?: string;
  readonly showTarget?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Mention states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<MentionCliProps>[] = [
  { name: "inline", props: { name: "Ada Osei" } },
  { name: "avatar", props: { name: "June Park", avatar: true } },
] as const;

/** Render one inline @mention or initials mention chip. */
const renderMentionCli: CliRenderer<MentionCliProps> = (
  props,
  capabilities,
) => {
  if (props.name.trim() === "") {
    throw new TypeError("mention name must be non-empty");
  }
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 3) {
    throw new TypeError(
      `mention width must be a safe integer of at least 3; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const identity = props.avatar === true
    ? `[${props.initials ?? derivedInitials(props.name, 2)}] ${props.name}`
    : `${props.sigil ?? "@"}${props.name}`;
  const target = props.showTarget === true && props.href !== undefined
    ? ` (${props.href})`
    : "";
  const value = truncateText(
    `${identity}${target}`,
    width,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(value, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
    ...(props.href === undefined ? {} : { underline: true as const }),
  }, capabilities);
};

export default renderMentionCli;
