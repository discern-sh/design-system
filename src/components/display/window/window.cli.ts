/**
 * Pure terminal renderer and deterministic example states for Window.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";

/** Inputs accepted by the terminal Window renderer. */
export interface WindowCliProps {
  readonly body: string;
  readonly title?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Window states rendered by `deno task catalogue:cli window`. */
export const cliExamples: readonly CliExample<WindowCliProps>[] = [
  { name: "titled", props: { title: "Preview", body: "Product interface" } },
  { name: "untitled", props: { body: "Framed presentation surface" } },
] as const;

/** Render a mark-titled presentation Window inside a terminal box. */
const renderWindowCli: CliRenderer<WindowCliProps> = (props, capabilities) => {
  for (const value of [props.body.replaceAll("\n", ""), props.title]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("window content must be control-free");
    }
  }
  const requestedWidth = props.width ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 5) {
    throw new TypeError(
      `window width must be a safe integer of at least 5; received ${requestedWidth}`,
    );
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  const motif = triangleGlyph(TRIANGLES.filled.up, capabilities.unicode);
  return renderBox(
    {
      body: props.body,
      title: `${motif}${
        props.title === undefined || props.title === "" ? "" : ` ${props.title}`
      }`,
      width: requestedWidth,
      padding: 1,
      borderStyle: {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
    },
    capabilities,
  );
};

export default renderWindowCli;
