/**
 * Pure terminal renderer and deterministic example states for Standard meter.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
} from "../../../cli/motif.ts";
import { renderMotifProgressFrame } from "../../../cli/motifs.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type {
  StandardDirection,
  StandardTrend,
} from "./standard-meter.types.ts";
import meta, { componentExampleVocabulary } from "./standard-meter.meta.ts";
import {
  assertWorkflowCliText,
  styleWorkflowHeading,
  workflowCliWidth,
  workflowFactLines,
  workflowPrefixedLines,
} from "../workflow-cli.ts";

/** Inputs accepted by the terminal Standard meter renderer. */
export interface StandardMeterCliProps extends TerminalMotifOptions {
  readonly label: string;
  readonly value: number;
  readonly limit: number;
  readonly direction: StandardDirection;
  readonly min?: number;
  readonly max?: number;
  readonly trend?: StandardTrend;
  readonly formatValue?: (value: number) => string;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Standard meter states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        label: "Line coverage",
        value: 92.4,
        limit: 80,
        direction: "floor",
        min: 0,
        max: 100,
        trend: "improving",
        formatValue: (value) => `${value}%`,
      },
    },
    {
      name: "ceiling",
      props: {
        label: "Stylesheet density",
        value: 2324,
        limit: 2350,
        direction: "ceiling",
        min: 0,
        max: 2350,
        trend: "drifting",
        formatValue: (value) => `${value} B`,
      },
    },
  ] as const satisfies readonly CliExample<StandardMeterCliProps>[],
);

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite; received ${value}`);
  }
}

/** Render one truthful standard reading, scale, limit, headroom, and trend. */
const renderStandardMeterCli: CliRenderer<StandardMeterCliProps> = (
  props,
  capabilities,
) => {
  assertWorkflowCliText(props.label, "standard label");
  assertFinite(props.value, "standard value");
  assertFinite(props.limit, "standard limit");
  const min = props.min ?? Math.min(0, props.value, props.limit);
  const max = props.max ?? Math.max(1, props.value, props.limit);
  assertFinite(min, "standard minimum");
  assertFinite(max, "standard maximum");
  if (max <= min) {
    throw new TypeError("standard maximum must exceed its minimum");
  }
  const width = workflowCliWidth(props.maxWidth, capabilities, 18);
  const formatValue = props.formatValue ?? String;
  const formattedValue = formatValue(props.value);
  const formattedLimit = formatValue(props.limit);
  assertWorkflowCliText(formattedValue, "formatted standard value");
  assertWorkflowCliText(formattedLimit, "formatted standard limit");
  const headroom = props.direction === "floor"
    ? props.value - props.limit
    : props.limit - props.value;
  const distance = Number(Math.abs(headroom).toPrecision(12));
  const withinLimit = headroom >= 0;
  const formattedDistance = formatValue(distance);
  assertWorkflowCliText(formattedDistance, "formatted standard headroom");
  const scaleValue = Math.min(max, Math.max(min, props.value)) - min;
  const scaleTotal = max - min;
  const heading = `${props.label}${
    props.trend === undefined
      ? ""
      : `${capabilities.unicode ? " · " : " - "}${props.trend}`
  }`;
  const headroomText = props.direction === "floor"
    ? `${formattedDistance} ${withinLimit ? "above" : "below"} floor`
    : `${formattedDistance} ${withinLimit ? "below" : "above"} ceiling`;
  return [
    styleWorkflowHeading(
      workflowPrefixedLines("", heading, width).join("\n"),
      withinLimit ? "success" : "danger",
      capabilities,
      props.theme,
    ),
    renderMotifProgressFrame(
      {
        completed: scaleValue,
        total: scaleTotal,
        width,
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...motifPassthrough(props),
      },
      { ...capabilities, columns: width },
    ),
    ...workflowFactLines("Current", formattedValue, width),
    ...workflowFactLines(
      "Status",
      withinLimit ? "Within limit" : "Outside limit",
      width,
    ),
    ...workflowFactLines(
      "Limit",
      `${props.direction} ${formattedLimit}`,
      width,
    ),
    ...workflowFactLines("Headroom", headroomText, width),
    ...workflowFactLines(
      "Direction",
      props.direction === "floor" ? "Higher is better" : "Lower is better",
      width,
    ),
  ].join("\n");
};

export default renderStandardMeterCli;
