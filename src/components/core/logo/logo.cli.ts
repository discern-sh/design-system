/**
 * Pure terminal renderer and deterministic example states for Logo.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import { measureText, padText, truncateText } from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { renderMotifPattern } from "../../../cli/motifs.ts";
import meta, { componentExampleVocabulary } from "./logo.meta.ts";
import type { LogoShape, LogoSize, LogoTreatment } from "./logo.types.ts";

/** Inputs accepted by the terminal Logo renderer. */
export interface LogoCliProps extends TerminalMotifOptions {
  readonly text: string;
  readonly size?: LogoSize;
  readonly treatment?: LogoTreatment;
  readonly shape?: LogoShape;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Logo states rendered by `deno task catalogue:cli logo`. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    { name: "default", props: { text: "Waypoint" } },
    {
      name: "tile",
      props: { text: "Northstar", treatment: "tile", size: "lg" },
    },
    {
      name: "square",
      props: { text: "N", shape: "square", treatment: "tile" },
    },
  ] as const satisfies readonly CliExample<LogoCliProps>[],
);

/** Render a motif-led terminal wordmark in natural or square form. */
const renderLogoCli: CliRenderer<LogoCliProps> = (props, capabilities) => {
  if (props.text === "" || /[\p{Cc}\p{Cf}]/u.test(props.text)) {
    throw new TypeError("logo text must be non-empty and control-free");
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `logo width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const treatment = props.treatment ?? "plain";
  const shape = props.shape ?? "natural";
  const theme = terminalThemes[props.theme ?? "dark"];
  const markOptions = props.theme === undefined
    ? {
      length: 1,
      register: "brand" as const,
      ...motifPassthrough(props),
    }
    : {
      length: 1,
      theme: props.theme,
      register: "brand" as const,
      ...motifPassthrough(props),
    };
  const mark = renderMotifPattern(markOptions, capabilities);
  const frameCells = treatment === "tile" ? 2 : 0;

  if (shape === "square") {
    const innerWidth = Math.max(
      measureText(mark),
      Math.min(measureText(props.text), width - frameCells),
    );
    const text = truncateText(
      props.text,
      innerWidth,
      capabilities.unicode ? "…" : ".",
    );
    const body = `${padText(mark, innerWidth, "center")}\n${
      padText(text, innerWidth, "center")
    }`;
    if (treatment === "plain") return body;
    const left = styleText(
      "[",
      { color: terminalToneColor(theme, "neutral") },
      capabilities,
    );
    const right = styleText(
      "]",
      { color: terminalToneColor(theme, "neutral") },
      capabilities,
    );
    return body.split("\n").map((line) => `${left}${line}${right}`).join("\n");
  }

  const available = width - measureText(mark) - 1 - frameCells;
  if (available < 1) {
    throw new TypeError(`logo width ${width} cannot hold its wordmark`);
  }
  const text = truncateText(
    props.text,
    available,
    capabilities.unicode ? "…" : ".",
  );
  const spans = [
    ...(treatment === "tile"
      ? [{ text: "[", style: { color: terminalToneColor(theme, "neutral") } }]
      : []),
    { text: mark },
    { text: " " },
    {
      text,
      style: {
        ...theme.typography.display,
        color: terminalToneColor(theme, "accent"),
      },
    },
    ...(treatment === "tile"
      ? [{ text: "]", style: { color: terminalToneColor(theme, "neutral") } }]
      : []),
  ];
  return renderStyledSpans(spans, capabilities);
};

export default renderLogoCli;
