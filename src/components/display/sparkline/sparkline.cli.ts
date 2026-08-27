/**
 * Pure terminal renderer and deterministic example states for Sparkline.
 *
 * The block run pairs the shared vertical eighth-block ramp with its
 * mandatory ASCII degradation, explicit nulls render the declared-gap
 * glyph, and the endpoint annotation prints in every charset so the
 * numeric truth never depends on glyph fidelity.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  DECLARED_GAP_GLYPH,
  rampGlyph,
  VERTICAL_EIGHTH_RAMP,
} from "../../../cli/glyph-ramps.ts";
import { measureText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./sparkline.meta.ts";
import {
  assertSparklineValues,
  sparklineAnnotation,
  sparklineLevels,
  type SparklineValue,
} from "./sparkline.shared.ts";

/** Inputs accepted by the terminal Sparkline renderer. */
export interface SparklineCliProps {
  /** Recent movement in order: finite values with explicit null gaps. */
  readonly values: readonly SparklineValue[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const cliExampleImplementations = [
  {
    name: "default",
    props: { values: [3.2, 4.1, 3.8, 5.5, 7.4, 9.1] },
  },
  {
    name: "with-gaps",
    props: { values: [12, null, 14, 19, null, 23] },
  },
  { name: "flat", props: { values: [5, 5, 5, 5, 5] } },
  { name: "decline", props: { values: [41, 38, 36, 39, 31, 28] } },
] as const satisfies readonly CliExample<SparklineCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Sparkline states rendered by the CLI Catalogue. */
export const cliExamples: readonly CliExample<SparklineCliProps>[] =
  cliExampleImplementations;

/** Render one block-context movement run with its endpoint annotation. */
const renderSparklineCli: CliRenderer<SparklineCliProps> = (
  props,
  capabilities,
) => {
  assertSparklineValues(props.values);
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `sparkline width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const annotation = sparklineAnnotation(props.values, capabilities.unicode);
  const required = props.values.length + 1 + measureText(annotation);
  if (required > width) {
    throw new TypeError(
      `sparkline needs ${required} columns for ${props.values.length} entries and its annotation; received ${width}`,
    );
  }
  const theme = terminalThemes[props.theme ?? "dark"];
  const run = sparklineLevels(props.values).map((level) => {
    if (level === null) {
      return rampGlyph(DECLARED_GAP_GLYPH, capabilities.unicode);
    }
    const member = VERTICAL_EIGHTH_RAMP[level - 1];
    if (member === undefined) {
      throw new TypeError(`sparkline level ${level} has no ramp glyph`);
    }
    return rampGlyph(member, capabilities.unicode);
  }).join("");
  return `${
    styleText(
      run,
      { color: terminalToneColor(theme, "accent") },
      capabilities,
    )
  } ${
    styleText(
      annotation,
      {
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
        ...theme.typography.annotation,
      },
      capabilities,
    )
  }`;
};

export default renderSparklineCli;
