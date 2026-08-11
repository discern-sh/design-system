/**
 * Pure terminal renderer and deterministic example states for Button.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { ButtonSize, ButtonVariant } from "./button.types.ts";

/** Inputs accepted by the terminal Button renderer. */
export interface ButtonCliProps {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly leadingIcon?: string;
  readonly trailingIcon?: string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const PADDING: Readonly<Record<ButtonSize, number>> = { sm: 1, md: 2, lg: 3 };

/** Deterministic Button states rendered by `deno task catalogue:cli button`. */
export const cliExamples: readonly CliExample<ButtonCliProps>[] = [
  { name: "primary", props: { label: "Continue" } },
  { name: "secondary", props: { label: "Preview", variant: "secondary" } },
  { name: "ghost", props: { label: "Cancel", variant: "ghost", size: "sm" } },
  { name: "danger", props: { label: "Delete", variant: "danger" } },
] as const;

/** Render one width-bounded terminal action with shared variant and size vocabulary. */
const renderButtonCli: CliRenderer<ButtonCliProps> = (props, capabilities) => {
  for (const value of [props.label, props.leadingIcon, props.trailingIcon]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("button content must be control-free");
    }
  }
  if (props.label === "") throw new TypeError("button label must be non-empty");
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `button width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const variant = props.variant ?? "primary";
  const padding = " ".repeat(PADDING[props.size ?? "md"]);
  const start = variant === "primary"
    ? `[${padding}`
    : variant === "secondary"
    ? `(${padding}`
    : variant === "danger"
    ? `[!${padding}`
    : padding;
  const end = variant === "primary" || variant === "danger"
    ? `${padding}]`
    : variant === "secondary"
    ? `${padding})`
    : padding;
  const iconWidth =
    (props.leadingIcon === undefined ? 0 : measureText(props.leadingIcon) + 1) +
    (props.trailingIcon === undefined
      ? 0
      : measureText(props.trailingIcon) + 1);
  const labelWidth = width - measureText(start) - measureText(end) - iconWidth;
  if (labelWidth < 1) {
    throw new TypeError(`button width ${width} cannot hold its content`);
  }
  const label = truncateText(
    props.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const content = `${
    props.leadingIcon === undefined ? "" : `${props.leadingIcon} `
  }${label}${props.trailingIcon === undefined ? "" : ` ${props.trailingIcon}`}`;
  const theme = terminalThemes[props.theme ?? "dark"];
  const tone = variant === "danger"
    ? "danger"
    : variant === "secondary" || variant === "ghost"
    ? "neutral"
    : "accent";
  return styleText(
    `${start}${content}${end}`,
    {
      ...(variant === "primary" || variant === "danger"
        ? theme.typography.strong
        : theme.typography.body),
      color: terminalToneColor(theme, tone),
    },
    capabilities,
  );
};

export default renderButtonCli;
