/**
 * Pure terminal renderer and deterministic example states for Window.
 *
 * @module
 */

import { renderBox } from "../../../cli/box.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import { triangleGlyph, TRIANGLES } from "../../../cli/triangles.ts";
import meta, { componentExampleVocabulary } from "./window.meta.ts";

/** Inputs accepted by the terminal Window renderer. */
export interface WindowCliProps {
  readonly body: string;
  readonly title?: string;
  readonly theme?: TerminalThemeVariant;
  readonly width?: number;
}

/** Deterministic Window states rendered by `deno task catalogue:cli window`. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "standard",
      props: {
        title: "lorem — ipsum",
        body:
          "Example content\nA clear frame\nSupporting content remains owned by the consumer.",
      },
    },
    {
      name: "showcase",
      props: {
        title: "workspace · example",
        body:
          "READY\nFeatured evidence\nA wider frame for the consequential view.\nThe body remains consumer-owned while the durable campaign chrome, depth, and status position travel with the component.",
      },
    },
  ] as const satisfies readonly CliExample<WindowCliProps>[],
);

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
