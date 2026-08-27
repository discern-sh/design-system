/**
 * Pure terminal renderer and deterministic example states for Tag.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { measureText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./tag.meta.ts";

/** Inputs accepted by the terminal Tag renderer. */
export interface TagCliProps {
  readonly label: string;
  readonly removable?: boolean;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Tag states rendered by `deno task catalogue:cli tag`. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { label: "Metadata" } },
    { name: "removable", props: { label: "Ipsum", removable: true } },
  ] as const satisfies readonly CliExample<TagCliProps>[],
);

/** Render a compact terminal metadata chip with an optional remove affordance. */
const renderTagCli: CliRenderer<TagCliProps> = (props, capabilities) => {
  if (props.label === "" || /[\p{Cc}\p{Cf}]/u.test(props.label)) {
    throw new TypeError("tag label must be non-empty and control-free");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `tag width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const open = capabilities.unicode ? "‹" : "[";
  const close = capabilities.unicode ? "›" : "]";
  const remove = props.removable === true
    ? capabilities.unicode ? " ×" : " x"
    : "";
  const labelWidth = width - measureText(open) - measureText(close) -
    measureText(remove) - 2;
  if (labelWidth < 1) {
    throw new TypeError(`tag width ${width} cannot hold its label`);
  }
  const label = truncateText(
    props.label,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const theme = terminalThemes[props.theme ?? "dark"];
  return styleText(
    `${open} ${label}${remove} ${close}`,
    {
      ...theme.typography.muted,
      color: terminalToneColor(theme, "neutral"),
    },
    capabilities,
  );
};

export default renderTagCli;
