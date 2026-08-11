/**
 * Pure terminal renderer and deterministic example states for Logo cloud.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical, wrapInlineCluster } from "../../../cli/layout.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { marketingCliWidth, wrapMarketingCliText } from "../marketing-frame.ts";

/** Inputs accepted by the terminal Logo cloud renderer. */
export interface LogoCloudCliProps {
  readonly label?: string;
  readonly items: readonly string[];
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Logo cloud states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<LogoCloudCliProps>[] = [
  {
    name: "names",
    props: {
      label: "Trusted by teams doing careful work",
      items: ["Northstar", "Fieldnote", "Common Ground", "Arc"],
    },
  },
] as const;

/** Render a wrapping terminal name roll without pretending to reproduce marks. */
const renderLogoCloudCli: CliRenderer<LogoCloudCliProps> = (
  props,
  capabilities,
) => {
  if (
    props.items.length === 0 || props.items.some((item) => item.trim() === "")
  ) {
    throw new TypeError("logo cloud requires non-empty item names");
  }
  const width = marketingCliWidth(props.width, capabilities);
  const theme = terminalThemes[props.theme ?? "dark"];
  const mark = capabilities.unicode ? "◆" : "*";
  const names = wrapInlineCluster(
    props.items.map((item) => `${mark} ${item}`),
    { columns: width, gap: 2 },
  );
  return joinVertical([
    props.label === undefined ? "" : styleText(
      wrapMarketingCliText(props.label, width),
      theme.typography.annotation,
      capabilities,
    ),
    styleText(names, {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "neutral"),
    }, capabilities),
  ]);
};

export default renderLogoCloudCli;
