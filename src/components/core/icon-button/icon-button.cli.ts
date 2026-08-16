/**
 * Pure terminal renderer and deterministic example states for Icon button.
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
import type { IconButtonSize, IconButtonVariant } from "./icon-button.types.ts";

/** Inputs accepted by the terminal Icon button renderer. */
export interface IconButtonCliProps {
  readonly icon: string;
  readonly asciiIcon?: string;
  readonly label: string;
  readonly variant?: IconButtonVariant;
  readonly size?: IconButtonSize;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const PADDING: Readonly<Record<IconButtonSize, number>> = {
  sm: 0,
  md: 1,
  lg: 2,
};

/** Deterministic Icon button states rendered by `deno task catalogue:cli icon-button`. */
export const cliExamples: readonly CliExample<IconButtonCliProps>[] = [
  { name: "quiet", props: { icon: "✦", asciiIcon: "*", label: "Generate" } },
  {
    name: "outline",
    props: {
      icon: "ⓘ",
      asciiIcon: "i",
      label: "Information",
      variant: "outline",
    },
  },
] as const;

/** Render a labelled terminal icon action with intentional ASCII fallback. */
const renderIconButtonCli: CliRenderer<IconButtonCliProps> = (
  props,
  capabilities,
) => {
  for (const value of [props.icon, props.asciiIcon, props.label]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("icon button content must be control-free");
    }
  }
  if (props.icon === "" || props.label === "") {
    throw new TypeError("icon button icon and label must be non-empty");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `icon button width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const icon = capabilities.unicode ? props.icon : props.asciiIcon ?? "*";
  const variant = props.variant ?? "quiet";
  const padding = variant === "outline"
    ? " ".repeat(PADDING[props.size ?? "md"])
    : "";
  const start = variant === "outline" ? `[${padding}` : "";
  const end = variant === "outline" ? `${padding}]` : "";
  const labelWidth = width - measureText(start) - measureText(end) -
    measureText(icon) - 1;
  if (labelWidth < 1) {
    throw new TypeError(`icon button width ${width} cannot hold its label`);
  }
  const label = truncateText(
    props.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(
    `${start}${icon} ${label}${end}`,
    {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    },
    capabilities,
  );
};

export default renderIconButtonCli;
