/**
 * Semantic terminal motif renderers for pure, capability-aware output.
 *
 * @module
 */

import { renderStyledSpans, type StyledSpan, styleText } from "./ansi.ts";
import type { TerminalCapabilities } from "./capabilities.ts";
import type { SequentialStepStatus } from "./interactive-states.ts";
import {
  type TerminalMotif,
  type TerminalMotifCycle,
  type TerminalMotifOptions,
  terminalMotifRepertoire,
} from "./motif.ts";
import { measureText, truncateText } from "./text.ts";
import {
  type TerminalSemanticTone,
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "./theme.ts";

/** Axis along which a motif pattern advances. */
export type MotifPatternOrientation = "horizontal" | "vertical";

/** Direction in which a motif reads. */
export type MotifDirection = "forward" | "reverse";

/** Shared theme and glyph selection for terminal motifs. */
export interface MotifThemeOptions extends TerminalMotifOptions {
  readonly theme?: TerminalThemeVariant;
}

/** Inputs for one horizontal or vertical motif pattern. */
export interface MotifPatternOptions extends MotifThemeOptions {
  readonly length: number;
  readonly orientation?: MotifPatternOrientation;
  readonly phase?: number;
  readonly direction?: MotifDirection;
  readonly tone?: TerminalSemanticTone;
}

/** Inputs for one quiet horizontal divider with a centred motif marker. */
export interface MotifDividerOptions extends MotifThemeOptions {
  /** Total visible divider width. */
  readonly width: number;
  /** Semantic tone for the centred marker; defaults to accent. */
  readonly tone?: TerminalSemanticTone;
}

/** Inputs for one truthful determinate progress frame. */
export interface MotifProgressOptions extends MotifThemeOptions {
  readonly completed: number;
  readonly total: number;
  /** Total visible frame width, including the percentage label. */
  readonly width: number;
}

/** Public visual treatments for a labeled terminal section boundary. */
export type MotifSectionRuleTreatment =
  | "embedded"
  | "underline"
  | "sandwich";

/** Inputs for a labeled motif section boundary. */
export interface MotifSectionRuleOptions extends MotifThemeOptions {
  readonly width: number;
  readonly phase?: number;
  readonly direction?: MotifDirection;
  /** Boundary geometry; defaults to the single-row strong embedded title. */
  readonly treatment?: MotifSectionRuleTreatment;
}

/** One semantic workflow step rendered by the motif stepper. */
export interface MotifWorkflowStep {
  readonly label: string;
  readonly status: SequentialStepStatus;
  /** Spinner phase used while this step is active. */
  readonly phase?: number;
}

/** Theme and motif selection for a workflow rail. */
export interface MotifWorkflowOptions extends MotifThemeOptions {}

/** Inputs for one moving motif activity beacon. */
export interface MotifBeaconOptions extends MotifThemeOptions {
  readonly width: number;
  /** Semantic animation phase; the renderer derives the marker position. */
  readonly phase: number;
  readonly direction?: MotifDirection;
}

function assertInteger(value: number, name: string, minimum?: number): void {
  if (
    !Number.isSafeInteger(value) || (minimum !== undefined && value < minimum)
  ) {
    const bound = minimum === undefined
      ? "a safe integer"
      : `a safe integer of at least ${minimum}`;
    throw new TypeError(`${name} must be ${bound}; received ${value}`);
  }
}

function normalizedIndex(index: number, length: number): number {
  return ((index % length) + length) % length;
}

function unknownSectionRuleTreatment(value: never): never {
  throw new TypeError(`unknown motif section-rule treatment: ${value}`);
}

function themeFor(variant: TerminalThemeVariant | undefined): TerminalTheme {
  return terminalThemes[variant ?? "dark"];
}

function patternGlyphs(
  motif: TerminalMotif | undefined,
  capabilities: TerminalCapabilities,
  direction: MotifDirection,
): TerminalMotifCycle {
  const glyphs = terminalMotifRepertoire(motif, capabilities.unicode).pattern;
  return direction === "forward"
    ? glyphs
    : [...glyphs].reverse() as unknown as TerminalMotifCycle;
}

function renderCycle(
  length: number,
  phase: number,
  direction: MotifDirection,
  capabilities: TerminalCapabilities,
  motif: TerminalMotif | undefined,
): string {
  const glyphs = patternGlyphs(motif, capabilities, direction);
  return Array.from({ length }, (_, index) => {
    return glyphs[normalizedIndex(phase + index, glyphs.length)] ?? glyphs[0];
  }).join("");
}

function motifColor(
  theme: TerminalTheme,
  tone: TerminalSemanticTone,
): ReturnType<typeof terminalToneColor> {
  return terminalToneColor(theme, tone);
}

/** Render a quiet horizontal rule around one centred motif marker. */
export function renderMotifDivider(
  options: MotifDividerOptions,
  capabilities: TerminalCapabilities,
): string {
  assertInteger(options.width, "motif divider width", 1);
  const width = Math.min(options.width, capabilities.columns);
  const theme = themeFor(options.theme);
  const marker = terminalMotifRepertoire(
    options.motif,
    capabilities.unicode,
  ).marker;
  const rule = capabilities.unicode ? "─" : "-";
  const leadingEdge = capabilities.unicode ? "╶" : "-";
  const trailingEdge = capabilities.unicode ? "╴" : "-";
  let leading = "";
  let trailing = "";
  if (width === 2) {
    trailing = trailingEdge;
  } else if (width >= 3 && width < 5) {
    const ruleCells = width - 3;
    const leadingRuleCells = Math.floor(ruleCells / 2);
    leading = leadingEdge + rule.repeat(leadingRuleCells);
    trailing = rule.repeat(ruleCells - leadingRuleCells) + trailingEdge;
  } else if (width >= 5) {
    const ruleCells = width - 5;
    const leadingRuleCells = Math.floor(ruleCells / 2);
    leading = `${leadingEdge}${rule.repeat(leadingRuleCells)} `;
    trailing = ` ${rule.repeat(ruleCells - leadingRuleCells)}${trailingEdge}`;
  }
  const ruleStyle = {
    color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    dim: true,
  } as const;
  return renderStyledSpans([
    { text: leading, style: ruleStyle },
    {
      text: marker,
      style: { color: motifColor(theme, options.tone ?? "accent") },
    },
    { text: trailing, style: ruleStyle },
  ], capabilities);
}

/** Render a configurable pattern through the effective motif repertoire. */
export function renderMotifPattern(
  options: MotifPatternOptions,
  capabilities: TerminalCapabilities,
): string {
  assertInteger(options.length, "motif pattern length", 1);
  const phase = options.phase ?? 0;
  assertInteger(phase, "motif pattern phase");
  const orientation = options.orientation ?? "horizontal";
  const direction = options.direction ?? "forward";
  const raw = orientation === "horizontal"
    ? renderCycle(
      options.length,
      phase,
      direction,
      capabilities,
      options.motif,
    )
    : Array.from(
      { length: options.length },
      (_, row) =>
        renderCycle(
          1,
          phase + row,
          direction,
          capabilities,
          options.motif,
        ),
    ).join("\n");
  return styleText(
    raw,
    { color: motifColor(themeFor(options.theme), options.tone ?? "accent") },
    capabilities,
  );
}

/** Render one canonical indeterminate spinner phase. */
export function renderMotifSpinnerFrame(
  phase: number,
  capabilities: TerminalCapabilities,
  options: MotifThemeOptions = {},
): string {
  assertInteger(phase, "motif spinner phase");
  const spinner = terminalMotifRepertoire(
    options.motif,
    capabilities.unicode,
  ).spinner;
  const glyph = spinner[normalizedIndex(phase, spinner.length)] ?? spinner[0];
  return styleText(
    glyph,
    { color: motifColor(themeFor(options.theme), "accent") },
    capabilities,
  );
}

function proportionalFloor(
  completed: number,
  total: number,
  units: number,
): number {
  const multiplied = completed * units;
  const scaled = Number.isFinite(multiplied)
    ? multiplied / total
    : completed / total * units;
  return Math.min(units, Math.floor(scaled));
}

/** Render zero-to-complete determinate progress without overstating completion. */
export function renderMotifProgressFrame(
  options: MotifProgressOptions,
  capabilities: TerminalCapabilities,
): string {
  if (!Number.isFinite(options.total) || options.total <= 0) {
    throw new TypeError(
      `motif progress total must be positive and finite; received ${options.total}`,
    );
  }
  if (
    !Number.isFinite(options.completed) || options.completed < 0 ||
    options.completed > options.total
  ) {
    throw new TypeError(
      `motif progress completed must be between 0 and ${options.total}; received ${options.completed}`,
    );
  }
  assertInteger(options.width, "motif progress width", 1);
  const width = Math.min(options.width, capabilities.columns);
  const percentage = proportionalFloor(options.completed, options.total, 100);
  const label = `[${String(percentage).padStart(3)}%] `;
  const trackWidth = width - measureText(label);
  if (trackWidth < 1) {
    throw new TypeError(
      `motif progress width must be at least ${
        measureText(label) + 1
      }; received ${width}`,
    );
  }
  const markerOffset = proportionalFloor(
    options.completed,
    options.total,
    trackWidth - 1,
  );
  const theme = themeFor(options.theme);
  const filledTone = options.completed === options.total ? "success" : "accent";
  const repertoire = terminalMotifRepertoire(
    options.motif,
    capabilities.unicode,
  );
  const filledRule = capabilities.unicode ? "━" : "=";
  const remainingRule = capabilities.unicode ? "─" : "-";
  return renderStyledSpans([
    { text: label, style: theme.typography.annotation },
    {
      text: filledRule.repeat(markerOffset),
      style: { color: motifColor(theme, filledTone) },
    },
    {
      text: repertoire.marker,
      style: { color: motifColor(theme, filledTone) },
    },
    {
      text: remainingRule.repeat(trackWidth - markerOffset - 1),
      style: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        dim: true,
      },
    },
  ], capabilities);
}

/** Render a full-width labeled section boundary with one motif marker. */
export function renderMotifSectionRule(
  label: string,
  options: MotifSectionRuleOptions,
  capabilities: TerminalCapabilities,
): string {
  if (label === "" || label.trim() !== label || /[\p{Cc}\p{Cf}]/u.test(label)) {
    throw new TypeError(
      "motif section label must be non-empty, trimmed, and control-free",
    );
  }
  assertInteger(options.width, "motif section-rule width", 1);
  const phase = options.phase ?? 0;
  assertInteger(phase, "motif section-rule phase");
  const width = Math.min(options.width, capabilities.columns);
  const theme = themeFor(options.theme);
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const requestedLabel = label.toUpperCase();
  const marker = renderCycle(
    1,
    phase,
    options.direction ?? "forward",
    capabilities,
    options.motif,
  );
  const treatment = options.treatment ?? "embedded";
  const accentStyle = { color: motifColor(theme, "accent") } as const;
  const headingStyle = {
    ...theme.typography.strong,
    color: terminalThemeColor(theme, "--discern-color-ink"),
  } as const;
  const strongRule = capabilities.unicode ? "━" : "=";
  const quietRule = capabilities.unicode ? "─" : "-";

  if (treatment === "embedded") {
    const lead = strongRule.repeat(2) + gap + marker + gap;
    const labelWidth = width - measureText(lead) - measureText(gap) - 1;
    if (labelWidth < 1) {
      throw new TypeError(
        `motif section-rule width ${width} is too narrow for the embedded treatment`,
      );
    }
    const displayLabel = truncateText(
      requestedLabel,
      labelWidth,
      capabilities.unicode ? "…" : ".",
    );
    const remaining = width - measureText(lead) - measureText(displayLabel) -
      measureText(gap);
    return renderStyledSpans([
      { text: lead, style: accentStyle },
      { text: displayLabel, style: headingStyle },
      { text: gap },
      { text: strongRule.repeat(remaining), style: accentStyle },
    ], capabilities);
  }

  const labelWidth = width - measureText(marker) - measureText(gap);
  if (labelWidth < 1) {
    throw new TypeError(
      `motif section-rule width ${width} is too narrow for the ${treatment} treatment`,
    );
  }
  const displayLabel = truncateText(
    requestedLabel,
    labelWidth,
    capabilities.unicode ? "…" : ".",
  );
  const heading = renderStyledSpans([
    { text: marker, style: accentStyle },
    { text: gap },
    { text: displayLabel, style: headingStyle },
  ], capabilities);
  if (treatment === "underline") {
    return `${heading}\n${
      styleText(strongRule.repeat(width), accentStyle, capabilities)
    }`;
  }
  if (treatment === "sandwich") {
    const ruleStyle = {
      ...theme.typography.muted,
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    } as const;
    const rule = styleText(quietRule.repeat(width), ruleStyle, capabilities);
    return `${rule}\n${heading}\n${rule}`;
  }
  return unknownSectionRuleTreatment(treatment);
}

function stepMarker(
  step: MotifWorkflowStep,
  index: number,
  capabilities: TerminalCapabilities,
  theme: TerminalTheme,
  motif: TerminalMotif | undefined,
): StyledSpan {
  if (step.status === "active") {
    const phase = step.phase ?? index;
    assertInteger(phase, `motif workflow step ${index + 1} phase`);
    const raw = `[${
      stripStyle(
        renderMotifSpinnerFrame(
          phase,
          { ...capabilities, colorDepth: "none" },
          motif === undefined ? {} : { motif },
        ),
      )
    }]`;
    return {
      text: raw,
      style: { color: motifColor(theme, "accent"), bold: true },
    };
  }
  if (step.status === "complete") {
    return {
      text: ` ${
        terminalMotifRepertoire(motif, capabilities.unicode).status.complete
      } `,
      style: { color: motifColor(theme, "success") },
    };
  }
  if (step.status === "error") {
    return {
      text: " ! ",
      style: { color: motifColor(theme, "danger"), bold: true },
    };
  }
  if (step.status === "cancelled") {
    return {
      text: ` ${capabilities.unicode ? "×" : "x"} `,
      style: { color: motifColor(theme, "neutral"), dim: true },
    };
  }
  return {
    text: ` ${
      terminalMotifRepertoire(motif, capabilities.unicode).status.incomplete
    } `,
    style: {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      dim: true,
    },
  };
}

function stripStyle(value: string): string {
  return value.replace(
    new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "gu"),
    "",
  );
}

/** Render semantic workflow step states on a vertical motif rail. */
export function renderMotifWorkflowStepper(
  steps: readonly MotifWorkflowStep[],
  capabilities: TerminalCapabilities,
  options: MotifWorkflowOptions = {},
): string {
  if (steps.length === 0) {
    throw new TypeError("motif workflow requires at least one step");
  }
  const theme = themeFor(options.theme);
  const gap = " ".repeat(theme.spacing["--discern-space-2"] ?? 1);
  const lines: string[] = [];
  for (const [index, step] of steps.entries()) {
    if (step.label === "" || /[\p{Cc}\p{Cf}]/u.test(step.label)) {
      throw new TypeError(
        `motif workflow step ${index + 1} has an invalid label`,
      );
    }
    const marker = stepMarker(
      step,
      index,
      capabilities,
      theme,
      options.motif,
    );
    const labelWidth = Math.max(
      1,
      capabilities.columns - measureText(marker.text) - measureText(gap),
    );
    const label = truncateText(
      step.label,
      labelWidth,
      capabilities.unicode ? "…" : ".",
    );
    lines.push(renderStyledSpans([
      marker,
      { text: gap },
      step.status === "pending"
        ? { text: label, style: theme.typography.muted }
        : { text: label },
    ], capabilities));
    if (index < steps.length - 1) {
      lines.push(styleText(
        ` ${capabilities.unicode ? "│" : "|"}`,
        {
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
          dim: true,
        },
        capabilities,
      ));
    }
  }
  return lines.join("\n");
}

/** Render one accent marker moving along a quiet out-and-back rail. */
export function renderMotifActivityBeacon(
  options: MotifBeaconOptions,
  capabilities: TerminalCapabilities,
): string {
  assertInteger(options.width, "motif beacon width", 2);
  assertInteger(options.phase, "motif beacon phase");
  const width = Math.min(options.width, capabilities.columns);
  if (width < 2) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold a motif beacon`,
    );
  }
  const maximumOffset = width - 1;
  const journey = Math.max(1, maximumOffset * 2);
  const cursor = normalizedIndex(options.phase, journey);
  let offset = cursor <= maximumOffset ? cursor : journey - cursor;
  if ((options.direction ?? "forward") === "reverse") {
    offset = maximumOffset - offset;
  }
  const theme = themeFor(options.theme);
  const rail = capabilities.unicode ? "─" : "-";
  const marker = terminalMotifRepertoire(
    options.motif,
    capabilities.unicode,
  ).marker;
  const railStyle = {
    color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    dim: true,
  } as const;
  return renderStyledSpans([
    {
      text: rail.repeat(offset),
      style: railStyle,
    },
    {
      text: marker,
      style: { color: motifColor(theme, "accent") },
    },
    {
      text: rail.repeat(maximumOffset - offset),
      style: railStyle,
    },
  ], capabilities);
}
